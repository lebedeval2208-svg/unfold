import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata={title:'UNFOLD — Everyone contributes. Nobody knows the plot.',description:'Write. Fold. Pass. A collaborative story game for 4–8 people, with private online rooms, one-device play, and a solo demo.',icons:{icon:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>;}
