/** Periodic collision and exact arc splitting helpers, embedded in the SVG. */
export function createPortals(width, height, padding = 0) {
  const wrap = (value, size) => ((value % size) + size) % size;
  const canonical = p => ({ x: wrap(p.x, width), y: wrap(p.y, height) });
  const cross = (a,b,c) => (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  function pointDistance(p,a,b) {
    const dx=b.x-a.x, dy=b.y-a.y;
    const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1)));
    return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
  }
  function segmentDistance(a,b,c,d) {
    if(cross(a,b,c)*cross(a,b,d)<0 && cross(c,d,a)*cross(c,d,b)<0) return 0;
    return Math.min(pointDistance(a,c,d),pointDistance(b,c,d),pointDistance(c,a,b),pointDistance(d,a,b));
  }
  function collides(a,b,c,d,gap) {
    // Enumerate only periodic images whose expanded bounding boxes can overlap.
    const x0=Math.ceil((Math.min(a.x,b.x)-gap-Math.max(c.x,d.x))/width);
    const x1=Math.floor((Math.max(a.x,b.x)+gap-Math.min(c.x,d.x))/width);
    const y0=Math.ceil((Math.min(a.y,b.y)-gap-Math.max(c.y,d.y))/height);
    const y1=Math.floor((Math.max(a.y,b.y)+gap-Math.min(c.y,d.y))/height);
    for(let x=x0;x<=x1;x++) for(let y=y0;y<=y1;y++) {
      const shift=p=>({x:p.x+x*width,y:p.y+y*height});
      if(segmentDistance(a,b,shift(c),shift(d))<gap) return true;
    }
    return false;
  }
  function split(arc, from, to, pointAt) {
    if(to<=from) return [];
    // Separate at direction extrema first, making each coordinate monotonic.
    const stops=[from,to];
    if(Math.abs(arc.turn)>1e-10) {
      const angleAt=s=>arc.heading+arc.turn*(s-arc.from)/(arc.to-arc.from);
      const lo=Math.min(angleAt(from),angleAt(to)), hi=Math.max(angleAt(from),angleAt(to));
      for(let k=Math.ceil(lo/(Math.PI/2));k<=Math.floor(hi/(Math.PI/2));k++) {
        const s=arc.from+(k*Math.PI/2-arc.heading)/arc.turn*(arc.to-arc.from);
        if(s>from+1e-9 && s<to-1e-9) stops.push(s);
      }
    }
    stops.sort((a,b)=>a-b);
    const cuts=[from,to];
    for(let i=1;i<stops.length;i++) {
      const lo=stops[i-1],hi=stops[i];
      for(const [axis,size] of [['x',width],['y',height]]) {
        const a=pointAt(arc,lo)[axis],b=pointAt(arc,hi)[axis];
        if(Math.abs(a-b)<1e-10) continue;
        for(let k=Math.ceil(Math.min(a,b)/size);k<=Math.floor(Math.max(a,b)/size);k++) {
          const edge=k*size;
          let left=lo,right=hi;
          for(let j=0;j<45;j++) {
            const mid=(left+right)/2;
            if((pointAt(arc,mid)[axis]<edge)===(a<b)) left=mid; else right=mid;
          }
          const s=(left+right)/2;
          if(s>from+1e-8 && s<to-1e-8) cuts.push(s);
        }
      }
    }
    cuts.sort((a,b)=>a-b);
    const unique=cuts.filter((s,i)=>i===0 || s-cuts[i-1]>1e-7);
    const pieces=[];
    for(let i=1;i<unique.length;i++) {
      const a=unique[i-1],b=unique[i],mid=pointAt(arc,(a+b)/2);
      const dx=-Math.floor(mid.x/width)*width,dy=-Math.floor(mid.y/height)*height;
      const shift=p=>({x:p.x+dx,y:p.y+dy});
      pieces.push({from:a,to:b,start:shift(pointAt(arc,a)),end:shift(pointAt(arc,b)),dx,dy});
    }
    return pieces;
  }
  function fragments(arc, piece, pointAt) {
    const points=[piece.start,piece.end];
    // Arc excursion from its chord is bounded by radius * (1-cos(angle/2)).
    const angle=Math.abs(arc.turn)*(piece.to-piece.from)/(arc.to-arc.from);
    const sagitta=Math.abs(arc.turn)<1e-10?0:(arc.to-arc.from)/Math.abs(arc.turn)*(1-Math.cos(angle/2));
    const pad=padding+sagitta;
    const xs=[0],ys=[0];
    if(Math.min(...points.map(p=>p.x))<pad) xs.push(width);
    if(Math.max(...points.map(p=>p.x))>width-pad) xs.push(-width);
    if(Math.min(...points.map(p=>p.y))<pad) ys.push(height);
    if(Math.max(...points.map(p=>p.y))>height-pad) ys.push(-height);
    return xs.flatMap(x=>ys.filter(y=>x!==0 || y!==0).map(y=>({
      ...piece,start:{x:piece.start.x+x,y:piece.start.y+y},end:{x:piece.end.x+x,y:piece.end.y+y},
    })));
  }
  return { canonical, collides, split, fragments };
}
