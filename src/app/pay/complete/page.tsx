export default async function PaymentCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; canceled?: string }>;
}) {
  const query = await searchParams;
  const message = query.canceled
    ? "The payment was canceled. You can use the payment link to try again."
    : query.error
      ? "This payment link could not be opened."
      : "If the payment succeeds, it is applied to the invoice automatically.";
  return (
    <main style={{ maxWidth: 560, margin: "48px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 28 }}>Payment</h1>
      <p>{message}</p>
    </main>
  );
}
