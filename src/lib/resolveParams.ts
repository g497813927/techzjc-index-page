export async function resolveParams<T>(p: T | Promise<T> | undefined): Promise<T> {
  if (p === undefined) {
    throw new Error("Missing route params: `params` is undefined");
  }
  return await Promise.resolve(p);
}

export default resolveParams;
