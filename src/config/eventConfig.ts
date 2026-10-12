const TBA = 'To be announced';

export const eventConfig = {
  title: 'IDEATHON 2.0',
  club: 'Young Innovators Club',
  institution: "Vignan's Foundation for Science, Technology and Research",
  timezone: 'Asia/Kolkata',
  schedule: { opens: '2026-10-13', closes: '2026-10-19', results: '2026-10-22', final: '2026-10-24' },
  departments: ['CSE', 'ACSE', 'IT'],
  years: ['2nd', '3rd'], // 2nd and 3rd academic years only
  teamSize: { min: 2, max: 4 }, // 2, 3, or 4 members
  whatsappGroupUrl: 'https://chat.whatsapp.com/GFTQNtdirjTEtnRSnbIU7n?s=cl&p=a&mlu=4&ilr=4',
  formUrl: '', // Official Google Form URL for Round 1
  venue: TBA,
  qualifyingTeams: [] as string[],
  finalResults: [] as { rank: string; team: string }[],
  coreOrganizers: [
    { name: 'Sriram Gurram', contact: '8688150840', tel: '8688150840', department: 'Department of CSE' },
    { name: 'Ajay Guptha', contact: '63046134594', tel: '63046134594', department: 'Department of CSE' },
    { name: 'SK. Reshma', contact: '98853 66384', tel: '9885366384', department: 'Department of CSE' },
  ],
  prizes: [
    { label: 'First Prize', amount: '₹4,000' },
    { label: 'Second Prize', amount: '₹3,000' },
    { label: 'Third Prize', amount: '₹2,000' },
    { label: 'Three Consolation Prizes', amount: '₹1,000 each' },
  ],
  timeline: [
    { date: '13 October', title: 'Abstract Submission Opens', text: 'The official Google Form will be circulated. Teams can submit abstracts through the form.' },
    { date: '19 October', title: 'Abstract Submission Closes', text: 'Final deadline for submitting abstracts.' },
    { date: '22 October', title: 'Round 2 Results', text: 'Organizers announce the teams selected for the final round. Qualifying teams will be published here.' },
    { date: '24 October', title: 'Final Round and Prize Declaration', text: 'Final presentations to judges using the official template, working basic prototype demonstration, rapid-fire questions, and prize declaration.' },
  ],
  announcements: [
    { title: 'Abstract Submission', status: 'Opens 13 October 2026' },
    { title: 'Round 2 Results', status: 'Scheduled for 22 October 2026' },
    { title: 'Final-Round Venue', status: TBA },
    { title: 'Event-Day Updates', status: TBA },
    { title: 'Final Results', status: TBA },
  ],
};

export type SubmissionState = 'before' | 'open' | 'closed';
export function submissionState(today: string): SubmissionState {
  const s = eventConfig.schedule;
  return today < s.opens ? 'before' : today <= s.closes ? 'open' : 'closed';
}
export const todayIST = () => new Date().toLocaleDateString('en-CA', { timeZone: eventConfig.timezone });
