export const outcomes = [
  { id: 'double', label: '2배', weight: 16, color: '#f57a73', message: '대박! 판돈이 두 배가 됐어요.' },
  { id: 'plus5', label: '+5회', weight: 12, color: '#ffd969', message: '판돈에 5장을 더해 돌려받았어요!' },
  { id: 'triple', label: '3배', weight: 6, color: '#c084fc', message: '초대박 잭팟! 판돈이 세 배가 됐어요!' },
  { id: 'plus2', label: '+2회', weight: 18, color: '#5eead4', message: '판돈에 2장을 더해 돌려받았어요!' },
  { id: 'half', label: '½배', weight: 4, color: '#9ed6bd', message: '판돈의 절반을 돌려받았어요.' },
  { id: 'blank', label: '꽝', weight: 14, color: '#b8d6f2', message: '휴! 판돈은 그대로 돌려받았어요.' },
  { id: 'minus1', label: '-1회', weight: 10, color: '#fed7aa', message: '판돈에서 1장을 뺀 만큼 돌려받았어요.' },
  { id: 'minus2', label: '-2회', weight: 10, color: '#f4a6c8', message: '판돈에서 2장을 뺀 만큼 돌려받았어요.' },
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
  if (!Number.isSafeInteger(stake)) throw new Error('Ticket limit exceeded');
  let remaining = tickets - bet;
  let payout = 0;
  if (id === 'triple') payout = stake * 3;
  if (id === 'double') payout = stake * 2;
  if (id === 'plus5') payout = stake + 5;
  if (id === 'plus2') payout = stake + 2;
  if (id === 'half') payout = Math.floor(stake / 2);
  if (id === 'blank') payout = stake;
  if (id === 'minus1') payout = Math.max(0, stake - 1);
  if (id === 'minus2') payout = Math.max(0, stake - 2);
  remaining += payout;
  if (!Number.isSafeInteger(remaining)) throw new Error('Ticket limit exceeded');
  return { tickets: remaining, carry: id === 'carry' ? stake : 0 };
}
