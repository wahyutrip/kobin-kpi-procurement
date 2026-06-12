/** Maps a data-quality warning/validation message to what the user should check. */
export function guidanceFor(message: string): string {
  if (message.includes("precedes its PR")) {
    return "Check the PR and PO document dates in the source system — the PO may have been backdated or the PR re-issued after the PO.";
  }
  if (message.includes("implausible ETA")) {
    return "The ETA year looks like a typo (far past/future). Correct the ETA on the PO in the source system and re-export.";
  }
  if (message.includes("negative PR→PO days")) {
    return "The PO date is earlier than the PR date. Verify which document date is wrong and fix it in the source system.";
  }
  if (message.includes("negative PO→GRPO days")) {
    return "The goods receipt is dated before the PO. Check the GRPO posting date — receipts cannot precede their PO.";
  }
  if (message.includes("exceeds PO qty")) {
    return "More was received than ordered. Check the GRPO quantity, or whether the PO quantity was amended after receipt.";
  }
  if (message.includes("invalid date")) {
    return "The date cell is not in DD.MM.YY format. Fix the cell in the export (the row was skipped).";
  }
  if (message.includes("invalid number")) {
    return "The quantity/price cell contains non-numeric text. Fix the cell in the export (the row was skipped).";
  }
  if (message.includes("is required")) {
    return "A mandatory field is empty in the export. Fill it in the source system or remove the incomplete row.";
  }
  return "Review this row in the source export and correct the underlying document if needed.";
}
