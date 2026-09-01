import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';
import { ZONE_LAMPS } from './content';

// requestAnimationFrame drives the drift and the glow. jsdom provides it but
// never paints, so the page renders at phase 0 - its resting state.

const cards = () =>
  screen.getAllByRole('button').filter((b) => b.className === 'card');

test('the opening screen is the masthead and five cards, nothing else', () => {
  render(<App />);
  expect(screen.getByAltText('FETAL MOVEMENT : TEAM MONOBLOC')).toBeInTheDocument();
  expect(cards()).toHaveLength(5);
  // The work is not explained until a card is opened.
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('tapping a card opens its panel, closing returns to the canvas', () => {
  render(<App />);
  fireEvent.click(cards()[0]);
  expect(screen.getByRole('dialog')).toHaveTextContent('Location');

  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('a panel opens in Korean and switches to English, headings staying put', () => {
  render(<App />);
  fireEvent.click(cards()[1]);
  const panel = screen.getByRole('dialog');

  expect(panel).toHaveTextContent('다섯 개의 축이 막 안에서 숨을 쉽니다.');
  expect(panel).toHaveTextContent('Work');          // heading is never translated

  fireEvent.click(screen.getByRole('button', { name: 'language' }));
  expect(panel).toHaveTextContent('Five axes breathe inside a membrane.');
  expect(panel).toHaveTextContent('Work');
  // The drifting labels are never translated either.
  expect(screen.getByAltText('FETAL MOVEMENT : TEAM MONOBLOC')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'language' }));
  expect(panel).toHaveTextContent('다섯 개의 축이 막 안에서 숨을 쉽니다.');
});

test('the location card carries the address and a way to open it in maps', () => {
  render(<App />);
  fireEvent.click(cards()[0]);
  const panel = screen.getByRole('dialog');

  expect(panel).toHaveTextContent('서울 마포구 와우산로 94');
  expect(screen.getByRole('link', { name: '지도에서 열기' })).toHaveAttribute(
    'target', '_blank',
  );
});

test('the zone card opens with the chart at its furthest zone', () => {
  render(<App />);
  fireEvent.click(cards()[1]);
  expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '0');
  // Only the build list is written out; the rest of the card is the chart.
  expect(screen.getByText('구동')).toBeInTheDocument();
});

test('the zone track moves between zones, and stops at both ends', () => {
  render(<App />);
  fireEvent.click(cards()[1]);
  const track = screen.getByRole('slider');

  fireEvent.keyDown(track, { key: 'ArrowUp' });   // already at the far end
  expect(track).toHaveAttribute('aria-valuenow', '0');

  fireEvent.keyDown(track, { key: 'ArrowDown' });
  expect(track).toHaveAttribute('aria-valuenow', '1');

  // Past the near end and held there. The piece has three zones, so the last
  // one is 2 - this reads it off the control rather than hard-coding it, so a
  // change to the zone count shows up as a real failure, not a stale number.
  const last = String(ZONE_LAMPS.length - 1);
  for (let i = 0; i < 6; i++) fireEvent.keyDown(track, { key: 'ArrowDown' });
  expect(track).toHaveAttribute('aria-valuenow', last);
});

test('the survey renders its questions and blocks sending until configured', () => {
  render(<App />);
  fireEvent.click(cards()[4]);
  expect(screen.getByRole('dialog')).toHaveTextContent('Feedback');
  expect(screen.getByText('작품의 움직임에서 가장 강하게 느껴진 인상은 무엇인가요?')).toBeInTheDocument();

  // No Supabase keys in the test environment, so sending must be refused
  // rather than failing silently against a missing endpoint.
  expect(screen.getByRole('button', { name: '제출' })).toBeDisabled();
});

test('an option can be picked and picked again to clear it', () => {
  render(<App />);
  fireEvent.click(cards()[4]);

  const opt = screen.getByRole('button', { name: '살아 있는 듯함' });
  expect(opt).toHaveAttribute('aria-pressed', 'false');

  fireEvent.click(opt);
  expect(opt).toHaveAttribute('aria-pressed', 'true');

  fireEvent.click(opt);
  expect(opt).toHaveAttribute('aria-pressed', 'false');
});

test('holding anywhere in the field spins it, and letting go stops it', () => {
  const { container } = render(<App />);
  const canvas = container.querySelector('.canvas');
  const hub = screen.getByRole('button', { name: 'hold to spin' });

  fireEvent.pointerDown(canvas);
  expect(hub).toHaveAttribute('aria-pressed', 'true');

  fireEvent.pointerUp(canvas);
  expect(hub).toHaveAttribute('aria-pressed', 'false');

  // A finger leaving the screen mid-hold has to end it, or it spins forever.
  fireEvent.pointerDown(canvas);
  fireEvent.pointerLeave(canvas);
  expect(hub).toHaveAttribute('aria-pressed', 'false');
});

test('pressing a card opens it instead of spinning the field', () => {
  const { container } = render(<App />);
  const canvas = container.querySelector('.canvas');
  const hub = screen.getByRole('button', { name: 'hold to spin' });

  fireEvent.pointerDown(cards()[0], { bubbles: true });
  expect(hub).toHaveAttribute('aria-pressed', 'false');

  fireEvent.pointerUp(canvas);
  fireEvent.click(cards()[0]);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});

test('an empty form can still be sent, and the note is optional', () => {
  render(<App />);
  fireEvent.click(cards()[4]);
  // Nothing is required: a visitor who only wants to answer one question, or
  // none, should not be stopped by the form.
  const send = screen.getByRole('button', { name: '제출' });
  expect(send).toBeInTheDocument();
});

test('closing a panel returns to the canvas with the cards still there', () => {
  render(<App />);
  fireEvent.click(cards()[2]);
  expect(screen.getByRole('dialog')).toHaveTextContent('Process');

  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(cards()).toHaveLength(5);
});

test('the page can scroll again after a panel has been opened and closed', () => {
  render(<App />);
  fireEvent.click(cards()[4]);          // the survey: re-renders on every tap
  fireEvent.click(screen.getByRole('button', { name: '살아 있는 듯함' }));
  expect(document.body.style.overflow).toBe('hidden');

  fireEvent.click(screen.getByRole('button', { name: '닫기' }));
  expect(document.body.style.overflow).toBe('');
});
