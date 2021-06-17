// export type ValuesOf<T extends any[]> = T[number];

// export type IDarray = string[];

export type allowOptionalProp<T> = {
  [P in keyof T]?: T[P] | null;
};

// fucking around down there

const a = {
  as: ["qwe", "erer", "eee"] as const,
  ak: ["dd", "ddddd", "d"] as const,
};

const ka: keyof typeof a = "as";

type ka = {
  [k in keyof typeof a]: typeof a[k][number];
};

interface salut {
  bross: boolean;
}

type sasa = ka & salut;
