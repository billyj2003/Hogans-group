export function VehicleRegList({ regs, id = "vehicle-regs" }: { regs: string[]; id?: string }) {
  return (
    <datalist id={id}>
      {regs.map((reg) => (
        <option key={reg} value={reg} />
      ))}
    </datalist>
  );
}
