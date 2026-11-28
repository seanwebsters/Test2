import type { Sim } from './types';
import { architect, creativeDirector, doctor, entrepreneur, filmDirector, lawyer, marketing, software } from './core';
import { coach, ecologist, electrician, hotel, scientist } from './lite';

export const SIMS: Sim[] = [creativeDirector, entrepreneur, architect, filmDirector, lawyer, software, doctor, marketing, scientist, ecologist, coach, hotel, electrician];
export const SIM_BY_ID: Record<string, Sim> = Object.fromEntries(SIMS.map((s) => [s.id, s]));
export const FEATURED_SIMS = ['creative-director', 'entrepreneur', 'architect', 'film-director', 'lawyer', 'software', 'doctor', 'marketing'];
