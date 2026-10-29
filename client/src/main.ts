import './style.css';

const experience = new URLSearchParams(location.search).get('experience');
document.body.dataset.experience = experience === 'taxi' ? 'taxi' : 'neighbourhood';
const note = document.querySelector('.header-note');
if (note) {
  note.replaceChildren();
  const navigation = document.createElement('nav'); navigation.className = 'experience-nav'; navigation.setAttribute('aria-label', 'Experience');
  for (const [label, href, active] of [['Neighbourhood', './', experience !== 'taxi'], ['Taxi lab', '?experience=taxi', experience === 'taxi']] as const) {
    const link = document.createElement('a'); link.textContent = label; link.href = href;
    if (active) link.setAttribute('aria-current', 'page'); navigation.append(link);
  }
  note.append(navigation);
}
if (experience === 'taxi') void import('./taxi-demo.js');
else void import('./neighbourhood.js');
