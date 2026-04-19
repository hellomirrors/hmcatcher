export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureMqttClient } = await import(
      "@/domain/messaging/mqtt-service"
    );
    ensureMqttClient();
  }
}
