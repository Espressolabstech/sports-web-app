declare module "roundrobin" {
  export default function robin<T>(count: number, players: T[]): [T, T][][];
}