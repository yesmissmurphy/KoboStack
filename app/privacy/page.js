export const metadata = {
  title: "Privacy policy | Stackt",
  description: "What Stackt stores, why, and how to have it deleted.",
};

export default function PrivacyPage() {
  return (
    <main className="shell">
      <div className="eyebrow">Stackt</div>
      <h1>Privacy policy</h1>
      <p className="lede">
        The short version: Stackt only keeps what it needs to deliver your
        Substacks to your Kobo. We do not sell your data, we do not run adverts,
        and we do not send marketing emails.
      </p>

      <div className="card" style={{ lineHeight: 1.65 }}>
        <h2>Who we are</h2>
        <p>
          Stackt is a small independent service run by an individual based in the
          United Kingdom. For questions about your data, email{" "}
          <a href="mailto:hello@kostackt.com">hello@kostackt.com</a>.
        </p>

        <h2>What we collect, and why</h2>
        <ul>
          <li>
            <strong>Your email address.</strong> Used to sign you in with a
            one-time link, and to identify your account. Legal basis: it is
            needed to provide the service you asked for.
          </li>
          <li>
            <strong>The Substack addresses you add.</strong> Used to check those
            publications for new posts.
          </li>
          <li>
            <strong>Your Dropbox connection.</strong> When you connect Dropbox we
            store a token that lets Stackt save files into the folder you choose.
            We never see your Dropbox password and we only write the EPUB files
            we create.
          </li>
          <li>
            <strong>Your chosen folder.</strong> The Dropbox folder your EPUBs are
            saved into.
          </li>
          <li>
            <strong>Your plan.</strong> Whether you have unlocked the paid plan,
            and the customer reference Stripe gives us. We never see or store
            your card details.
          </li>
        </ul>

        <h2>The EPUB files</h2>
        <p>
          We fetch the public posts from the Substacks you add, convert them to
          EPUB and save them into your Dropbox. We do not keep a copy of the
          posts or the EPUB files ourselves.
        </p>

        <h2>Who handles your data</h2>
        <p>
          We use a small number of services to run Stackt. They process your data
          only to provide their part of the service:
        </p>
        <ul>
          <li>Vercel, which hosts the website and runs the daily job.</li>
          <li>Supabase, which stores accounts, your Substack list and sign-in.</li>
          <li>Dropbox, where your EPUB files are saved.</li>
          <li>Stripe, which takes payment for the paid plan.</li>
          <li>
            ImprovMX, which forwards emails sent to our contact address to us.
          </li>
        </ul>
        <p>
          Some of these providers process data outside the UK. Where they do, they
          rely on recognised safeguards for international transfers.
        </p>

        <h2>Cookies</h2>
        <p>
          We use only the cookie needed to keep you signed in. We do not use
          advertising or tracking cookies.
        </p>

        <h2>How long we keep it</h2>
        <p>
          We keep your data for as long as you have an account. If you ask us to
          delete your account, we delete your email, Substack list, Dropbox
          connection and plan details. Records of a payment may be kept by Stripe
          for as long as the law requires them to.
        </p>

        <h2>Your rights</h2>
        <p>
          Under UK data protection law you can ask to see the data we hold about
          you, correct it, or have it deleted. You can also disconnect Dropbox at
          any time from your dashboard, which removes our access straight away.
          To make a request, email{" "}
          <a href="mailto:hello@kostackt.com">hello@kostackt.com</a> from the
          address you signed up with. If you are unhappy with how we have handled
          your data, you can complain to the Information Commissioner&apos;s
          Office at ico.org.uk.
        </p>

        <h2>Changes</h2>
        <p>
          If we change how we use your data, for example by adding emails about
          new features, we will update this page first and ask for your consent
          before sending you anything. Last updated 20 October 2026.
        </p>
      </div>

      <p style={{ marginTop: 32 }}>
        <a href="/login">Back to sign in</a>
      </p>
    </main>
  );
}
