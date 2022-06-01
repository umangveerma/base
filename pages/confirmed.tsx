import Confirmed from '../components/confirmed';
import 'react-circular-progressbar/dist/styles.css';
import BackLink from '../components/backlink';

export default function ConfirmedPage() {
    return (
      <div className='flex flex-col gap-8 items-center'>
      <BackLink href='/'>New Mint</BackLink>
      <div className='h-80 w-80'><Confirmed /></div>
    </div>
    )
  }