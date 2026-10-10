"use client";
import { Children, useState } from "react";
import Link from "next/link";
import { Input, Select, Button } from "./FormControls";
import { EmptyState, SkeletonTable } from "./Feedback";

function cellText(node) {
  if (typeof node === "string" || typeof node === "number") return String(node);
  return Children.toArray(node?.props?.children).map(cellText).join(" ");
}

// Existing pages supply rendered cells so server actions and detail drawers stay server-owned.
export default function DataTable({ children, label = "Records", toolbar, pagination, loading = false, error, emptyTitle = "No matching records", emptyDescription = "Try changing your filters.", columns, searchable = true, pageSize = 20 }) {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("");
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const entries = Children.toArray(children).filter(child => child?.props);
  const headings = columns || Children.toArray(entries[0]?.props.children);
  const rows = columns ? entries : entries.slice(1);
  const filterColumns = headings.map((heading,index) => ({ label: cellText(heading), index })).filter(column => /^(status|category|format)$/i.test(column.label.trim()));
  const filtered = rows.filter(row => cellText(row).toLowerCase().includes(search.toLowerCase()) && Object.entries(filters).every(([index,value]) => !value || cellText(Children.toArray(row.props.children)[Number(index)]) === value));
  if (sort !== "") filtered.sort((a,b) => cellText(Children.toArray(a.props.children)[Number(sort)]).localeCompare(cellText(Children.toArray(b.props.children)[Number(sort)]), undefined, { numeric: true }));
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visible = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  return <section className="dashboard-table-section" aria-label={label}>
    {toolbar}
    {searchable && rows.length > 0 && <div className="dashboard-table-tools"><label><span>Search loaded records</span><Input type="search" placeholder={`Search ${label.toLowerCase()}`} value={search} onChange={event => { setSearch(event.target.value); setPage(1); }}/></label>{filterColumns.map(column => <label key={column.index}><span>{column.label}</span><Select aria-label={column.label} value={filters[column.index] || ""} onChange={event => { setFilters({ ...filters, [column.index]: event.target.value }); setPage(1); }}><option value="">All {column.label.toLowerCase()}</option>{[...new Set(rows.map(row => cellText(Children.toArray(row.props.children)[column.index])))].filter(Boolean).sort().map(value => <option key={value}>{value}</option>)}</Select></label>)}<label><span>Sort text A-Z</span><Select aria-label="Sort text A-Z" value={sort} onChange={event => { setSort(event.target.value); setPage(1); }}><option value="">Original order</option>{headings.map((heading,index) => !/action|detail|date|issued|when/i.test(cellText(heading)) && <option key={index} value={index}>{cellText(heading)}</option>)}</Select></label></div>}
    {searchable && rows.length > 0 && <p className="dashboard-table-count" role="status">{filtered.length} of {rows.length} loaded records</p>}
    {error ? <p className="form-error" role="alert">{error}</p> : loading ? <SkeletonTable/> : !filtered.length ? <EmptyState title={emptyTitle}>{emptyDescription}</EmptyState> : <div className="dashboard-table-scroll" role="region" aria-label={`${label} table`} tabIndex={0}>
      <table className="dashboard-table"><caption className="dashboard-sr-only">{label}</caption><thead><tr>{headings.map((heading, index) => <th scope="col" key={index}>{heading}</th>)}</tr></thead>
        <tbody>{visible.map((row, index) => <tr key={row.key ?? index}>{Children.toArray(row.props.children).map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>}
    {filtered.length > pageSize && <nav className="dashboard-pagination" aria-label={`${label} pagination`}><span>{(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} loaded records</span><div><Button variant="secondary" type="button" disabled={currentPage === 1} onClick={() => setPage(currentPage - 1)}>Previous</Button><Button variant="secondary" type="button" disabled={currentPage === totalPages} onClick={() => setPage(currentPage + 1)}>Next</Button></div></nav>}
    {pagination}
  </section>;
}

export function Pagination({ previous, next, children, label = "Pages" }) {
  return <nav className="dashboard-pagination" aria-label={label}><span>{children}</span><div>{previous && <Link className="button button-secondary" href={previous}>Previous</Link>}{next && <Link className="button button-secondary" href={next}>Next</Link>}</div></nav>;
}
