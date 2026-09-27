// TODO: send the uploaded bill image/PDF to Claude and return { billerName, accountNumber, serviceDate, statementDate, amountOwed }.
export async function POST() {
  return Response.json({ error: "Bill extraction is not built yet" }, { status: 501 });
}
