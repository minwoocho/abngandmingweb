export const outcomes = [
  { id: 'double', label: '2배', weight: 16, color: '#f57a73', message: '대박! 판돈이 두 배가 됐어요.' },
  { id: 'plus5', label: '+5회', weight: 12, color: '#ffd969', message: '꿍찰권 5장이 뿅! 추가됐어요.' },
  { id: 'triple', label: '3배', weight: 6, color: '#c084fc', message: '초대박 잭팟! 판돈이 세 배가 됐어요!' },
  { id: 'plus2', label: '+2회', weight: 18, color: '#5eead4', message: '나이스! 꿍찰권 2장 추가 획득!' },
  { id: 'half', label: '½배', weight: 4, color: '#9ed6bd', message: '남은 꿍찰권이 절반으로 줄었어요. 아앗!' },
  { id: 'blank', label: '꽝', weight: 14, color: '#b8d6f2', message: '이번 판은 쉬어가기… 다음엔 대박!' },
  { id: 'minus1', label: '-1회', weight: 10, color: '#fed7aa', message: '아쉽지만 꿍찰권 1장 차감이에요.' },
  { id: 'minus2', label: '-2회', weight: 10, color: '#f4a6c8', message: '꿍찰권이 2장 더 줄었어요.' },
  { id: 'carry', label: '묻고 더블로', weight: 10, color: '#f7a869', message: '판돈을 다음 판으로 이월했어요!' },
].map((item, index, all) => ({ ...item, angle: (all.slice(0, index).reduce((sum, x) => sum + x.weight, 0) + item.weight / 2) * 3.6 }));

export function pickOutcome(roll = Math.random()) {
  if (roll < 0 || roll >= 1 || !Number.isFinite(roll)) throw new Error('Invalid roll');
  let cursor = 0;
  return outcomes.find(outcome => (cursor += outcome.weight) > roll * 100) || outcomes[outcomes.length - 1];
}

export function resolveSpin(tickets, carry, bet, id) {
  if (![tickets, carry, bet].every(n => Number.isSafeInteger(n) && n >= 0) || bet > tickets || (bet === 0 && carry === 0) || !outcomes.some(x => x.id === id)) throw new Error('Invalid bet');
  const stake = bet + carry;
  let remaining = tickets - bet;
  if (id === 'triple') remaining += stake * 3;
  if (id === 'double') remaining += stake * 2;
  if (id === 'plus5') remaining += 5;
  if (id === 'plus2') remaining += 2;
  if (id === 'half') remaining = Math.floor(remaining / 2);
  if (id === 'minus1') remaining = Math.max(0, remaining - 1);
  if (id === 'minus2') remaining = Math.max(0, remaining - 2);
  if (!Number.isSafeInteger(remaining) || !Number.isSafeInteger(stake)) throw new Error('Ticket limit exceeded');
  return { tickets: remaining, carry: id === 'carry' ? stake : 0 };
}
