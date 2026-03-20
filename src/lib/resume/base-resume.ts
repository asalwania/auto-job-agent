import type { BaseResume } from '@/types';

const baseResume: BaseResume = {
  id: 'base-v1',
  fullName: 'YOUR_NAME',
  email: 'YOUR_EMAIL',
  phone: 'YOUR_PHONE',
  linkedin: 'YOUR_LINKEDIN_URL',
  github: 'YOUR_GITHUB_URL',
  summary: 'YOUR_SUMMARY — 2-3 sentences about your background',
  experience: [
    {
      company: 'COMPANY_1',
      title: 'TITLE_1',
      startDate: '2022-01',
      endDate: 'present',
      bullets: [
        'BULLET_1',
        'BULLET_2',
        'BULLET_3',
      ],
    },
    // Add more experience blocks as needed
  ],
  education: [
    {
      institution: 'YOUR_COLLEGE',
      degree: 'B.Tech',
      field: 'Computer Science',
      graduationYear: 2020,
    },
  ],
  skills: ['React', 'TypeScript', 'Node.js', 'Python', 'ADD_YOUR_SKILLS'],
  certifications: [],
  projects: [
    {
      name: 'PROJECT_NAME',
      description: 'PROJECT_DESCRIPTION',
      techStack: ['Next.js', 'Supabase'],
      url: 'https://github.com/yourhandle/project',
    },
  ],
};

export default baseResume;
