// Partnership architecture: schools, universities and employers can be added as
// data. A partner can feature careers, add opportunities and unlock Plus for
// their members. In production this would come from an API keyed by an invite code.
export interface Partner {
  code: string;
  name: string;
  kind: 'school' | 'university' | 'employer';
  featuredCareers: string[];
  opportunities: { title: string; detail: string }[];
  grantsPlus: boolean;
}

export const DEMO_PARTNERS: Partner[] = [
  {
    code: 'DEMO-SCHOOL', name: 'Demo Academy (sample partner)', kind: 'school',
    featuredCareers: ['software-developer', 'nurse', 'electrician'],
    opportunities: [
      { title: 'Careers fair — sample event', detail: 'Meet local employers. (Prototype example.)' },
      { title: 'Work experience week', detail: 'Placements with partner employers. (Prototype example.)' },
    ],
    grantsPlus: true,
  },
];
