export async function register() {
  // Evaluates the active environment runtime context before launching structural Node components
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./instrumentation.node");
  }
}
