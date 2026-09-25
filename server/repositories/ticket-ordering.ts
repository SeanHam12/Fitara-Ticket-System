export type ColumnTicket = { id: string; statusId: string }

export function calculateColumnMove(
  rows: ColumnTicket[],
  ticketId: string,
  sourceStatusId: string,
  targetStatusId: string,
  beforeTicketId?: string | null,
) {
  const target = rows
    .filter((row) => row.statusId === targetStatusId && row.id !== ticketId)
    .map((row) => row.id)
  const insertion =
    beforeTicketId == null ? target.length : target.indexOf(beforeTicketId)
  if (insertion < 0) return null
  target.splice(insertion, 0, ticketId)
  const source =
    sourceStatusId === targetStatusId
      ? []
      : rows
          .filter(
            (row) => row.statusId === sourceStatusId && row.id !== ticketId,
          )
          .map((row) => row.id)
  return { source, target }
}
