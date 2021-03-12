// export type ValuesOf<T extends any[]> = T[number];

// export type IDarray = string[];

const a = {
  as: ["qwe", "erer", "eee"] as const,
  ak: ["dd", "ddddd", "d"] as const,
};

const ka: keyof typeof a = "as";

type ka = {
  [k in keyof typeof a]: typeof a[k][number];
};

interface salut {
  bross: Boolean;
}

type sasa = ka & salut;
