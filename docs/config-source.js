/** Edit literal configuration values while retaining comments and untouched text. */
export function updateConfigSource(source, changes) {
  const comments = /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g;
  const masked = source.replace(comments,
    token => token.startsWith('/') ? token.replace(/[^\r\n]/g, ' ') : token);
  const tokens = [...masked.matchAll(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[A-Za-z_$][\w$]*|[^\s]/g)];
  let cursor = 0;
  const edits = [];
  const fail = () => { throw new Error('Cannot safely edit config.js; use literal objects, arrays and values with unique keys'); };
  const take = text => { if (tokens[cursor++]?.[0] !== text) fail(); };

  function parse() {
    const token = tokens[cursor++];
    if (!token) fail();
    const text = token[0], start = token.index;
    if (text === '{' || text === '[') {
      const array = text === '[', close = array ? ']' : '}';
      const children = new Map();
      while (tokens[cursor]?.[0] !== close) {
        let key = children.size;
        if (!array) {
          const name = tokens[cursor++]?.[0];
          if (!name || !/^(?:[A-Za-z_$][\w$]*|"[^"\\]*"|'[^'\\]*')$/.test(name)) fail();
          key = name.replace(/^["']|["']$/g, '');
          take(':');
        }
        if (children.has(key)) fail();
        children.set(key, parse());
        if (tokens[cursor]?.[0] !== close) take(',');
      }
      take(close);
      return { start, end: tokens[cursor - 1].index + 1, children, array };
    }
    let value;
    if (text === 'null') value = null;
    else if (text === 'true' || text === 'false') value = text === 'true';
    else if (/^[+-]?(?:\d|\.)/.test(text)) value = Number(text);
    else if (/^["']/.test(text)) value = text; // Strings are untouched by Studio controls.
    else fail();
    return { start, end: start + text.length, value };
  }

  function patch(node, value) {
    if (node.children && value !== null && typeof value === 'object' && node.array === Array.isArray(value)) {
      if (!node.array || node.children.size === value.length) {
        for (const [key, next] of Object.entries(value)) {
          const child = node.children.get(node.array ? Number(key) : key);
          if (!child) fail();
          patch(child, next);
        }
        return;
      }
    }
    if (!node.children && Object.is(node.value, value)) return;
    const original = source.slice(node.start, node.end);
    const retained = [...original.matchAll(comments)].map(match => match[0]).filter(text => text.startsWith('/'));
    // When replacing an entire array/object, retain its comments before the new literal.
    const prefix = retained.length ? '\n' + retained.join('\n') + '\n' : '';
    const indent = source.slice(source.lastIndexOf('\n', node.start - 1) + 1, node.start).match(/^[ \t]*/)[0];
    const text = JSON.stringify(value, null, 2).replace(/\n/g, '\n' + indent);
    edits.push({ start: node.start, end: node.end, text: prefix + text });
  }

  for (const [name, settings] of Object.entries(changes)) {
    const matches = [...masked.matchAll(new RegExp(`\\bexport\\s+const\\s+${name}\\s*=`, 'g'))];
    if (matches.length !== 1) throw new Error(`Expected exactly one ${name} export in config.js`);
    const start = matches[0].index + matches[0][0].length;
    cursor = tokens.findIndex(token => token.index >= start);
    const root = parse();
    if (!root.children || root.array) fail();
    patch(root, settings);
  }
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    source = source.slice(0, edit.start) + edit.text + source.slice(edit.end);
  }
  return source;
}
