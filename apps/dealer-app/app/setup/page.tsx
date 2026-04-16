import { SetupWizard } from '../../components/setup-wizard';
import { getAppContext } from '../../lib/app-context';

export default async function SetupPage() {
  const context = await getAppContext();
  return <SetupWizard context={context} />;
}
