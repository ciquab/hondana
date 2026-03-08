/** Base result type for all Server Actions */
export type ActionResult<T = object> = { error?: string } & T;
