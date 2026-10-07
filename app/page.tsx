import Editor from "./editor";
import { compileRuntime } from "./compile";

export default async function Home() {
  return <Editor runtimeSource={await compileRuntime()} />;
}
