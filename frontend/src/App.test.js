import { render, screen } from '@testing-library/react';
import App from './App';

test('花札のタイトルが表示される', () => {
  render(<App />);
  expect(screen.getByText(/花札 対戦（簡易こいこい）/)).toBeInTheDocument();
});
