// EDIT the values below, then have a lawyer review both pages before launch.
const CO = {
  name: "YOUR COMPANY OR YOUR NAME",
  email: "privacy@yourdomain.com",
  country: "YOUR COUNTRY",
  updated: "DATE",
};

export function Privacy() {
  return (
    <article className="panel prose">
      <h1>Privacy Policy</h1>
      <p>
        Last updated: {CO.updated}. Operator: {CO.name}. Contact: {CO.email}.
      </p>
      <h2>What we collect</h2>
      <p>
        Your email address, a salted hash of your password (we never store the
        password itself), the URLs you submit for analysis and the results, and
        standard server logs such as IP address and request time.
      </p>
      <h2>Why we collect it</h2>
      <p>
        To run your account, perform the analyses you request, prevent abuse,
        and keep the service secure.
      </p>
      <h2>Cookies</h2>
      <p>
        We set one strictly necessary session cookie to keep you signed in. We
        do not use advertising or analytics cookies.
      </p>
      <h2>Sharing</h2>
      <p>
        We do not sell your data. It is shared only with the hosting providers
        needed to run the service, or when required by law.
      </p>
      <h2>Retention and your rights</h2>
      <p>
        We keep account data until you ask us to delete it. You may request
        access, correction, export or deletion at {CO.email}.
      </p>
      <h2>Security</h2>
      <p>
        Data is transmitted over HTTPS and access is restricted. No system is
        perfectly secure, so we cannot guarantee absolute security.
      </p>
      <h2>Governing law</h2>
      <p>This policy is governed by the laws of {CO.country}.</p>
    </article>
  );
}

export function Terms() {
  return (
    <article className="panel prose">
      <h1>Terms and Conditions</h1>
      <p>
        Last updated: {CO.updated}. Operator: {CO.name}.
      </p>
      <h2>Use of the service</h2>
      <p>
        You may use Cache Optimizer to analyze URLs you own or are permitted to
        test. You must not use it to attack, overload or scan third-party
        systems, or to try to reach private networks.
      </p>
      <h2>Accounts</h2>
      <p>
        You are responsible for keeping your credentials safe and for activity
        under your account. We may suspend accounts that break these terms.
      </p>
      <h2>No warranty</h2>
      <p>
        The service and its recommendations are provided as is. Test any caching
        change before deploying it to production.
      </p>
      <h2>Liability</h2>
      <p>
        To the extent allowed by law, {CO.name} is not liable for indirect or
        consequential losses arising from use of the service.
      </p>
      <h2>Changes and law</h2>
      <p>
        We may update these terms and will change the date above when we do.
        These terms are governed by the laws of {CO.country}. Contact:{" "}
        {CO.email}.
      </p>
    </article>
  );
}
