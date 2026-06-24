import { Badge, Card, DataTable, PageHeader, StatGrid } from '../../components/cards';

const sampleVehicles = [
  {
    name: '2016 Toyota Corolla LE',
    price: '$9,995',
    mileage: '96,240 mi',
    status: 'Ready',
    channelFit: 'Marketplace value car',
    source: '/inventory/2016-toyota-corolla-le'
  },
  {
    name: '2014 Ford F-150 XLT',
    price: '$14,500',
    mileage: '128,811 mi',
    status: 'Needs photo review',
    channelFit: 'Craigslist follow-up candidate',
    source: '/inventory/2014-ford-f150-xlt'
  },
  {
    name: '2019 Nissan Altima SV',
    price: '$15,750',
    mileage: '72,410 mi',
    status: 'Price edge case',
    channelFit: 'Validate buyer quality',
    source: '/inventory/2019-nissan-altima-sv'
  }
];

const interviewQuestions = [
  ['Current workflow', 'Walk me through how this car gets from your website to Facebook Marketplace today.'],
  ['Posting effort', 'How long does one unit take, and who usually does the copy, photo, and price checks?'],
  ['Safety', 'Would copy-and-approve posting feel safer than full automation for your store?'],
  ['Lead speed', 'Who should get the SMS alert when a Marketplace shopper asks if the car is available?'],
  ['Pricing', 'Which monthly price would feel like an easy yes if this saves a few hours per week?']
];

const exitCriteria = [
  ['Dealer interviews', '10 completed conversations'],
  ['Pain validation', '5 dealers say this saves real posting time'],
  ['Beta supply', '3 dealers share real inventory URLs'],
  ['Paid signal', '2 dealers commit to pay if their source works'],
  ['MVP decision', 'Copy-and-approve vs. browser-assisted posting decided']
];

export default function ValidationPage() {
  return (
    <div className="stack page-stack">
      <PageHeader
        title="Phase 0 validation workspace"
        subtitle="Use this working prototype to test the first product direction: one inventory URL to Marketplace-ready posts with lead alerts."
      />

      <StatGrid
        stats={[
          { label: 'Sprint length', value: '2 weeks', hint: 'Discovery before deeper build', tone: 'blue' },
          { label: 'Target lot size', value: '10–75', hint: 'Independent used-car units', tone: 'green' },
          { label: 'Price test', value: '$29–$99', hint: 'No setup fee', tone: 'amber' },
          { label: 'Exit signal', value: '3 betas', hint: 'Real inventory URLs', tone: 'slate' }
        ]}
      />

      <div className="content-grid">
        <Card title="1 · Inventory URL intake" subtitle="Lead with the dead-simple setup promise." accent="blue">
          <div className="stack">
            <label className="field">
              <span>Dealer inventory URL</span>
              <input readOnly value="https://exampledealer.com/used-inventory" aria-label="Dealer inventory URL" />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Primary channel</span>
                <select defaultValue="facebook" aria-label="Primary channel">
                  <option value="facebook">Facebook Marketplace</option>
                  <option value="craigslist">Craigslist later</option>
                  <option value="offerup">OfferUp later</option>
                </select>
              </label>
              <label className="field">
                <span>Lead alert destination</span>
                <input readOnly value="+1 (555) 013-1400" aria-label="Lead alert phone" />
              </label>
            </div>
            <p className="surface-note">
              Validation prompt: ask whether this single URL field feels easier than feed setup, CSV upload, or a demo-gated onboarding call.
            </p>
          </div>
        </Card>

        <Card title="2 · Dealer-safe workflow" subtitle="Avoid overpromising brittle automation." accent="amber">
          <div className="stack">
            <p>
              <Badge tone="green">Approval-based</Badge>{' '}
              <Badge tone="blue">No setup fee</Badge>{' '}
              <Badge tone="slate">No desktop software</Badge>
            </p>
            <p className="muted">
              Position the first version as assisted posting: LotPilot prepares the listing, the dealer reviews it, and the dealer stays in control before anything goes live.
            </p>
            <p className="surface-note">
              Validation prompt: ask where Facebook Marketplace posting assistance starts to feel risky, gray, or dependent on a rule change.
            </p>
          </div>
        </Card>
      </div>

      <Card title="3 · Imported vehicle preview" subtitle="Show the dealer what LotPilot would normalize from their URL." accent="green">
        <DataTable
          columns={['Vehicle', 'Price', 'Mileage', 'Status', 'Channel fit', 'Source path']}
          rows={sampleVehicles.map((vehicle) => [
            vehicle.name,
            vehicle.price,
            vehicle.mileage,
            vehicle.status,
            vehicle.channelFit,
            <span className="mono-copy" key={vehicle.source}>{vehicle.source}</span>
          ])}
        />
      </Card>

      <div className="content-grid">
        <Card title="4 · Marketplace-ready post preview" subtitle="AI stays quiet; workflow speed is the headline." accent="blue">
          <div className="listing-preview stack">
            <div>
              <p className="eyebrow">Generated title</p>
              <h3>2016 Toyota Corolla LE · 96k miles · $9,995</h3>
            </div>
            <div>
              <p className="eyebrow">Copy-ready description</p>
              <p>
                Clean 2016 Toyota Corolla LE with 96,240 miles. Priced under $10k and ready for a quick local appointment. Message for availability, trade value, and the fastest way to see it today.
              </p>
            </div>
            <div>
              <p className="eyebrow">Posting checklist</p>
              <ul className="check-list">
                <li>Confirm price and mileage match the dealer site.</li>
                <li>Lead with exterior front photo, then interior and odometer.</li>
                <li>Copy title, description, and contact block into Marketplace.</li>
                <li>Mark post as prepared after dealer approval.</li>
              </ul>
            </div>
          </div>
        </Card>

        <Card title="5 · Lead alert setup" subtitle="Response speed validates the second half of the wedge." accent="green">
          <div className="stack">
            <label className="field">
              <span>Alert owner</span>
              <input readOnly value="Sam, Sales Manager" aria-label="Alert owner" />
            </label>
            <label className="field">
              <span>SMS template</span>
              <input readOnly value="New Marketplace lead for {vehicle}: {message}" aria-label="SMS template" />
            </label>
            <p className="surface-note">
              Validation prompt: ask if SMS alerts are worth paying for before Craigslist or OfferUp crossposting exists.
            </p>
          </div>
        </Card>
      </div>

      <div className="content-grid">
        <Card title="Interview prompts" accent="slate">
          <DataTable columns={['Topic', 'Question']} rows={interviewQuestions} />
        </Card>

        <Card title="Exit criteria" accent="amber">
          <DataTable columns={['Signal', 'Target']} rows={exitCriteria} />
        </Card>
      </div>
    </div>
  );
}
