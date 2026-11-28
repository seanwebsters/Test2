import type { Career, Route } from './types';

export const uni = (title: string, detail: string, time = '3–4 years'): Route => ({ type: 'university', title, detail, time });
export const appr = (title: string, detail: string, time = '2–4 years'): Route => ({ type: 'apprenticeship', title, detail, time });
export const self = (title: string, detail: string, time = '6–24 months'): Route => ({ type: 'self-taught', title, detail, time });
export const ent = (title: string, detail: string, time = 'Any time'): Route => ({ type: 'entrepreneur', title, detail, time });
export const coll = (title: string, detail: string, time = '1–2 years'): Route => ({ type: 'college', title, detail, time });
export const job = (title: string, detail: string, time = '1–3 years'): Route => ({ type: 'on-the-job', title, detail, time });

type Lite = Omit<Career, 'salaryVerified' | 'salary' | 'lifestyle'> & {
  pay: [number, number, number, number, number?, number?];
  life: [string, string, Career['lifestyle']['flexibility'], Career['lifestyle']['travel']];
};

/** Compact authoring helper. `pay` is in £k: entry lo/hi, experienced lo/hi, senior lo/hi. */
export function career(c: Lite): Career {
  const { pay, life, ...rest } = c;
  return {
    ...rest,
    salary: {
      entry: [pay[0], pay[1]],
      experienced: [pay[2], pay[3]],
      senior: pay[4] ? [pay[4], pay[5] ?? pay[4]] : undefined,
    },
    salaryVerified: null,
    lifestyle: { hours: life[0], setting: life[1], flexibility: life[2], travel: life[3] },
  };
}
