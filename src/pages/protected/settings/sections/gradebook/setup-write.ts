import { toast } from "sonner";

/** Runs a setup write, toasts its success, and says whether it went through. */
export async function done(write: Promise<unknown>, success: string, description?: string): Promise<boolean> {
  try {
    await write;
    toast.success(success, description ? { description } : undefined);
    return true;
  } catch {
    // The base query has already said why.
    return false;
  }
}
