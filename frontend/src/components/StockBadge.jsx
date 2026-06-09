export default function StockBadge({ stock, minimo = 5 }) {
  if (stock > minimo) {
    return <span className="badge-green">{stock}</span>;
  }
  if (stock > 0) {
    return <span className="badge-yellow">{stock}</span>;
  }
  return <span className="badge-red">{stock}</span>;
}
