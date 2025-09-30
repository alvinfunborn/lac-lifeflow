declare module 'tomlify-j0.4' {
  interface Tomlify {
    toToml(obj: any, opts?: any): string;
    toKey(path: string | any[], alt?: any): string;
    toValue(obj: any, opts?: any): string;
  }
  
  const tomlify: Tomlify;
  export = tomlify;
}
