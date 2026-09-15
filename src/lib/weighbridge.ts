export function parseWeighbridgeFields(formData: FormData) {
  const grossRaw = String(formData.get("grossWeight") ?? "").trim();
  const tareRaw = String(formData.get("tareWeight") ?? "").trim();
  const temperatureRaw = String(formData.get("temperature") ?? "").trim();
  const loadNumber = String(formData.get("loadNumber") ?? "").trim() || null;

  const grossWeight = grossRaw ? Number(grossRaw) : null;
  const tareWeight = tareRaw ? Number(tareRaw) : null;
  const temperature = temperatureRaw ? Number(temperatureRaw) : null;

  if (grossWeight != null && !Number.isFinite(grossWeight)) {
    throw new Error("Gross weight must be a number.");
  }
  if (tareWeight != null && !Number.isFinite(tareWeight)) {
    throw new Error("Tare weight must be a number.");
  }
  if (temperature != null && !Number.isFinite(temperature)) {
    throw new Error("Temperature must be a number.");
  }

  let netWeight: number | null = null;
  if (grossWeight != null && tareWeight != null) {
    if (tareWeight >= grossWeight) {
      throw new Error("Tare weight must be less than gross weight.");
    }
    netWeight = Math.round((grossWeight - tareWeight) * 100) / 100;
  }

  return { grossWeight, tareWeight, temperature, loadNumber, netWeight };
}
