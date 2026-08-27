import './globals.css';

export const metadata = {
  title: 'Dragon Duel — ITeC UNITAS Fair',
  description: 'A 2D platformer boss fight built for the ITeC UNITAS Fair.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
