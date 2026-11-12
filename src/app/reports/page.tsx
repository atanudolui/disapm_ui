"use client";

import { Close, Download, Location } from "@carbon/icons-react";
import { PieChart } from "@carbon/charts-react";
import {
  Accordion,
  AccordionItem,
  Button,
  Column,
  Grid,
  InlineNotification,
  Pagination,
  Search,
  Tag,
  Tile,
} from "@carbon/react";
import { useRouter } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { getApiUrl } from "@/lib/api-url";
import { Fragment, useCallback, useEffect, useState } from "react";

type AreaKey =
  | "approachRoadsPathways"
  | "ghatLighting"
  | "crowdManagement"
  | "safety"
  | "policeWomenPolice"
  | "cctvPublicAddress"
  | "rescueTeam"
  | "drinkingWaterSanitation"
  | "womenFacilitiesSignage"
  | "emergencyResponse"
  | "cleanliness";

interface ReportDeficiency {
  category: AreaKey;
  description: string;
  status: "pending" | "rectified";
  actionTaken: string;
}

interface GhatReportEntry {
  ghat: {
    id: string;
    name: string;
    waterbodyType: "river" | "pond";
    district: string;
    subDivision: string;
    block: string;
    nodalOfficerName: string;
    nodalOfficerContact: string;
  };
  inspections: ReportInspection[];
  latestInspection: {
    id: string;
    periodStart: string;
    periodEnd: string;
    occasion: string;
    latitude: number | null;
    longitude: number | null;
    inspectedBy: string;
    checklist: Record<
      AreaKey,
      {
        status: "compliant" | "deficiency" | "not_applicable";
        notes: string;
      }
    >;
    photos: ReportInspectionPhoto[];
  } | null;
  pendingDeficiencies: ReportDeficiency[];
  rectifiedDeficiencies: ReportDeficiency[];
}

interface ReportInspection {
  id: string;
  periodStart: string;
  periodEnd: string;
  occasion: string;
  latitude: number | null;
  longitude: number | null;
  inspectedBy: string;
  createdAt: string;
  updatedAt: string;
  checklist: Record<
    AreaKey,
    {
      status: "compliant" | "deficiency" | "not_applicable";
      notes: string;
    }
  >;
  deficiencies: ReportDeficiency[];
  photos: ReportInspectionPhoto[];
}

interface ReportInspectionPhoto {
  id: string;
  fileName: string;
}

interface ActionTakenReport {
  generatedAt: string;
  totalGhats: number;
  inspectedGhats: number;
  pendingDeficiencies: number;
  ghats: GhatReportEntry[];
}

function csvCell(value: unknown) {
  const text = value == null ? "" : String(value);
  const safeText = /^[\t\r\n ]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function downloadInspectionCsv(report: ActionTakenReport) {
  const headers = [
    "Ghat ID",
    "Ghat name",
    "Waterbody type",
    "District",
    "Sub-Division",
    "Block",
    "Nodal Officer",
    "Nodal Officer contact",
    "Inspection ID",
    "Festival / occasion",
    "Period start",
    "Period end",
    "Latitude",
    "Longitude",
    "Inspected by",
    "Inspection created at",
    "Inspection updated at",
    ...AREA_KEYS.flatMap((key) => [
      `${AREA_LABELS[key]} status`,
      `${AREA_LABELS[key]} notes`,
    ]),
    "Deficiencies",
  ];
  const rows = report.ghats.flatMap((entry) => {
    const inspections = entry.inspections.length ? entry.inspections : [null];
    return inspections.map((inspection) => [
      entry.ghat.id,
      entry.ghat.name,
      entry.ghat.waterbodyType,
      entry.ghat.district,
      entry.ghat.subDivision,
      entry.ghat.block,
      entry.ghat.nodalOfficerName,
      entry.ghat.nodalOfficerContact,
      inspection?.id,
      inspection?.occasion,
      inspection?.periodStart,
      inspection?.periodEnd,
      inspection?.latitude,
      inspection?.longitude,
      inspection?.inspectedBy,
      inspection?.createdAt,
      inspection?.updatedAt,
      ...AREA_KEYS.flatMap((key) => [
        inspection?.checklist[key]?.status,
        inspection?.checklist[key]?.notes,
      ]),
      inspection
        ? inspection.deficiencies.length
          ? inspection.deficiencies
              .map((deficiency) => {
                const action = deficiency.actionTaken
                  ? `; Action taken: ${deficiency.actionTaken}`
                  : "";
                return `${AREA_LABELS[deficiency.category]}: ${deficiency.description} (${deficiency.status}${action})`;
              })
              .join("; ")
          : "No deficiencies reported"
        : "",
    ]);
  });
  const csv = [headers, ...rows]
    .map((row) => row.map(csvCell).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${csv}`], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `action-taken-inspections-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: "admin" | "user";
}

const AREA_LABELS: Record<AreaKey, string> = {
  approachRoadsPathways: "Approach roads and pathways maintained",
  ghatLighting: "Ghat lighting and backup power",
  crowdManagement: "Crowd management",
  safety: "Safety",
  policeWomenPolice: "Police and women police",
  cctvPublicAddress: "CCTV, public address",
  rescueTeam: "Rescue team",
  drinkingWaterSanitation: "Public amenities: drinking water and sanitation",
  womenFacilitiesSignage:
    "Public amenities: women’s changing facilities and signage",
  emergencyResponse: "Emergency response",
  cleanliness: "Cleanliness and upkeep",
};

const AREA_KEYS: AreaKey[] = [
  "approachRoadsPathways",
  "ghatLighting",
  "crowdManagement",
  "safety",
  "policeWomenPolice",
  "cctvPublicAddress",
  "rescueTeam",
  "drinkingWaterSanitation",
  "womenFacilitiesSignage",
  "emergencyResponse",
  "cleanliness",
];

async function errorMessage(response: Response) {
  const body: { message?: string | string[] } = await response
    .json()
    .catch(() => ({}));
  return Array.isArray(body.message)
    ? body.message.join(" ")
    : (body.message ?? "Unable to load the Action Taken Report.");
}

export default function ReportsPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [report, setReport] = useState<ActionTakenReport | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [reportSearch, setReportSearch] = useState("");
  const [expandedGhatIds, setExpandedGhatIds] = useState<Set<string>>(
    () => new Set(),
  );
  const normalizedReportSearch = reportSearch.trim().toLocaleLowerCase();
  const filteredGhats =
    report?.ghats.filter((entry) => {
      if (!normalizedReportSearch) return true;
      const inspectionText = entry.latestInspection
        ? [
            entry.latestInspection.occasion,
            ...AREA_KEYS.map(
              (key) => entry.latestInspection?.checklist[key]?.notes ?? "",
            ),
          ].join(" ")
        : "";
      const deficiencyText = [
        ...entry.pendingDeficiencies,
        ...entry.rectifiedDeficiencies,
      ]
        .map(
          (item) =>
            `${AREA_LABELS[item.category]} ${item.description} ${item.actionTaken}`,
        )
        .join(" ");
      return [
        entry.ghat.name,
        entry.ghat.district,
        entry.ghat.subDivision,
        entry.ghat.block,
        entry.ghat.nodalOfficerName,
        entry.ghat.nodalOfficerContact,
        entry.latestInspection?.latitude?.toFixed(5) ?? "",
        entry.latestInspection?.longitude?.toFixed(5) ?? "",
        inspectionText,
        deficiencyText,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(normalizedReportSearch);
    }) ?? [];
  const totalItems = filteredGhats.length;
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, pageCount);
  const inspectionCoverage = report?.totalGhats
    ? Math.round((report.inspectedGhats / report.totalGhats) * 100)
    : 0;
  const uninspectedGhats = report
    ? report.totalGhats - report.inspectedGhats
    : 0;
  const rectifiedDeficiencies =
    report?.ghats.reduce(
      (total, entry) => total + entry.rectifiedDeficiencies.length,
      0,
    ) ?? 0;
  const executivePosition = !report?.totalGhats
    ? {
        title: "No sites registered",
        tone: "neutral",
        summary:
          "Register ghats to begin tracking inspection coverage and actions.",
      }
    : report.pendingDeficiencies > 0
      ? {
          title: "Action required",
          tone: "attention",
          summary: `${report.pendingDeficiencies} open ${
            report.pendingDeficiencies === 1
              ? "action remains"
              : "actions remain"
          } across the reporting area.`,
        }
      : uninspectedGhats > 0
        ? {
            title: "Inspection in progress",
            tone: "progress",
            summary: `${uninspectedGhats} ${
              uninspectedGhats === 1 ? "ghat is" : "ghats are"
            } awaiting inspection before the report can be considered complete.`,
          }
        : {
            title: "Ready for review",
            tone: "complete",
            summary:
              "All registered ghats have been inspected with no open actions.",
          };

  const loadReport = useCallback(async () => {
    setError("");
    setIsLoading(true);
    try {
      const profileResponse = await fetch(`${getApiUrl()}/auth/me`, {
        credentials: "include",
      });
      if (profileResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!profileResponse.ok) {
        throw new Error("Unable to verify your sign-in.");
      }
      setProfile(await profileResponse.json());

      const reportResponse = await fetch(`${getApiUrl()}/reports/action-taken`, {
        credentials: "include",
      });
      if (reportResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!reportResponse.ok) {
        throw new Error(await errorMessage(reportResponse));
      }
      setReport(await reportResponse.json());
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the Action Taken Report.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadReport);
  }, [loadReport]);

  async function handleLogout() {
    try {
      const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Unable to sign out.");
      router.replace("/login");
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to sign out.",
      );
    }
  }

  return (
    <>
      <AppHeader user={profile} onSignOut={handleLogout} />

      <main className="report-main" id="main-content">
        <Grid>
          <Column sm={4} md={8} lg={16}>
            <div className="report-heading">
              <div>
                <p className="dashboard-eyebrow">
                  GOVERNMENT OF WEST BENGAL · FIELD COMPLIANCE
                </p>
                <h1 className="dashboard-title">Action Taken Report</h1>
              </div>
              <Button
                kind="primary"
                renderIcon={Download}
                disabled={!report}
                onClick={() => report && downloadInspectionCsv(report)}
              >
                Download CSV
              </Button>
            </div>
            {error && (
              <InlineNotification
                kind="error"
                lowContrast
                title="Report unavailable"
                subtitle={error}
              />
            )}
          </Column>
          <Column sm={4} md={8} lg={16}>
            {isLoading ? (
              <div className="report-loading" role="status">
                <span
                  className="report-loading__indicator"
                  aria-hidden="true"
                />
                <span>Preparing your report…</span>
              </div>
            ) : report ? (
              <>
                <section
                  className="report-overview"
                  aria-label="Report details"
                >
                  <div>
                    <p className="report-overview__label">
                      REPORTING AUTHORITY
                    </p>
                    <p className="report-overview__order">
                      Government of West Bengal
                    </p>
                    <p className="report-overview__generated">
                      Generated {new Date(report.generatedAt).toLocaleString()}
                    </p>
                  </div>
                </section>
                <section
                  className={`report-executive-summary report-executive-summary--${executivePosition.tone}`}
                  aria-label="Executive summary"
                >
                  <div className="report-executive-summary__position">
                    <span
                      className="report-executive-summary__indicator"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="report-overview__label"></p>
                      <h2>{executivePosition.title}</h2>
                    </div>
                  </div>
                  <p className="report-executive-summary__text">
                    {executivePosition.summary}
                    {report.totalGhats > 0 &&
                      ` ${report.inspectedGhats} of ${report.totalGhats} ghats inspected (${inspectionCoverage}% coverage); ${rectifiedDeficiencies} ${
                        rectifiedDeficiencies === 1
                          ? "action rectified"
                          : "actions rectified"
                      }.`}
                  </p>
                </section>
                <div className="report-stats">
                  <Tile className="report-stat report-stat--registered">
                    <p className="report-stat__label">Registered ghats</p>
                    <p className="report-stat__value">{report.totalGhats}</p>
                    <p className="report-stat__hint">In the ghat register</p>
                  </Tile>
                  <Tile className="report-stat report-stat--coverage">
                    <div className="report-stat__topline">
                      <p className="report-stat__label">Inspection coverage</p>
                      <strong>{inspectionCoverage}%</strong>
                    </div>
                    <p className="report-stat__value">
                      {report.inspectedGhats}
                      <span> / {report.totalGhats}</span>
                    </p>
                    <div
                      className="report-progress"
                      role="progressbar"
                      aria-label="Inspection coverage"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={inspectionCoverage}
                    >
                      <span style={{ width: `${inspectionCoverage}%` }} />
                    </div>
                    <p className="report-stat__hint">Ghats inspected</p>
                  </Tile>
                  <Tile className="report-stat report-stat--uninspected">
                    <p className="report-stat__label">Awaiting inspection</p>
                    <p className="report-stat__value">{uninspectedGhats}</p>
                    <p className="report-stat__hint">Ghats still to inspect</p>
                  </Tile>
                  <Tile className="report-stat report-stat--actions">
                    <p className="report-stat__label">Actions pending</p>
                    <p className="report-stat__value">
                      {report.pendingDeficiencies}
                    </p>
                    <p className="report-stat__hint">
                      Deficiencies awaiting rectification
                    </p>
                  </Tile>
                  <Tile className="report-stat report-stat--rectified">
                    <p className="report-stat__label">Actions rectified</p>
                    <p className="report-stat__value">
                      {rectifiedDeficiencies}
                    </p>
                    <p className="report-stat__hint">Recorded as completed</p>
                  </Tile>
                </div>
                <section className="report-chart" aria-labelledby="report-chart-title">
                  <div className="report-chart__visual">
                    <PieChart
                      data={[
                        { group: "Inspected", value: report.inspectedGhats },
                        { group: "Awaiting inspection", value: uninspectedGhats },
                      ]}
                      options={{
                        accessibility: {
                          svgAriaLabel: `${report.inspectedGhats} of ${report.totalGhats} ghats inspected; ${uninspectedGhats} awaiting inspection`,
                        },
                        height: "300px",
                        resizable: true,
                        color: {
                          scale: {
                            Inspected: "#007d79",
                            "Awaiting inspection": "#ff832b",
                          },
                        },
                        legend: { enabled: true, position: "bottom" },
                        tooltip: {
                          enabled: true,
                          valueFormatter: (value) => `${value} ghats`,
                        },
                        toolbar: {
                          enabled: false
                        },
                      }}
                    />
                  </div>
                  <div className="report-chart__details">
                    <p className="report-chart__eyebrow">FIELD INSPECTIONS</p>
                    <h2 id="report-chart-title">Inspection coverage</h2>
                    <p>Share of registered ghats with a recorded inspection.</p>
                    <div className="report-chart__metrics">
                      <div className="report-chart__metric report-chart__metric--inspected">
                        <span className="report-chart__metric-name">
                          <span aria-hidden="true" /> Inspected
                        </span>
                        <strong>{report.inspectedGhats}</strong>
                        <small>{inspectionCoverage}% of registered ghats</small>
                      </div>
                      <div className="report-chart__metric report-chart__metric--awaiting">
                        <span className="report-chart__metric-name">
                          <span aria-hidden="true" /> Awaiting inspection
                        </span>
                        <strong>{uninspectedGhats}</strong>
                        <small>{report.totalGhats ? 100 - inspectionCoverage : 0}% of registered ghats</small>
                      </div>
                    </div>
                  </div>
                </section>
                {report.ghats.length === 0 ? (
                  <Tile className="report-empty">
                    No ghats have been registered. Add ghats and record joint
                    inspections to prepare this report.
                  </Tile>
                ) : (
                  <>
                    <div className="report-toolbar">
                      <Search
                        className="report-search"
                        id="action-report-search"
                        labelText="Search report"
                        placeholder="Search ghats, areas, officers..."
                        size="lg"
                        value={reportSearch}
                        onChange={(event) => {
                          setReportSearch(event.currentTarget.value);
                          setPage(1);
                        }}
                        onClear={() => {
                          setReportSearch("");
                          setPage(1);
                        }}
                      />
                      <p className="report-result-count" aria-live="polite">
                        Showing <strong>{totalItems}</strong>{" "}
                        {totalItems === 1 ? "ghat" : "ghats"}
                      </p>
                    </div>
                    {filteredGhats.length === 0 ? (
                      <Tile className="report-empty">
                        No ghats match your search. Try another search term.
                      </Tile>
                    ) : (
                      <div className="report-table-scroll">
                        <table className="report-table">
                          <thead>
                            <tr>
                              <th scope="col">Ghat</th>
                              <th scope="col">Sub-Division</th>
                              <th scope="col">Block</th>
                              <th scope="col">Festival / occasion</th>
                              <th scope="col">Festival period</th>
                              <th scope="col">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredGhats.map((entry, index) => {
                              const isExpanded = expandedGhatIds.has(
                                entry.ghat.id,
                              );
                              const latitude =
                                entry.latestInspection?.latitude;
                              const longitude =
                                entry.latestInspection?.longitude;
                              const isOutsidePage =
                                index < (currentPage - 1) * pageSize ||
                                index >= currentPage * pageSize;
                              const detailsId = `report-ghat-details-${entry.ghat.id}`;
                              return (
                                <Fragment key={entry.ghat.id}>
                                  <tr
                                    className={
                                      isOutsidePage
                                        ? "report-table__row--outside-page"
                                        : undefined
                                    }
                                  >
                                    <th scope="row">
                                      <div className="report-table__ghat">
                                        <button
                                          className="report-table__toggle"
                                          type="button"
                                          aria-expanded={isExpanded}
                                          aria-controls={detailsId}
                                          onClick={() =>
                                            setExpandedGhatIds((current) => {
                                              const next = new Set(current);
                                              if (next.has(entry.ghat.id)) {
                                                next.delete(entry.ghat.id);
                                              } else {
                                                next.add(entry.ghat.id);
                                              }
                                              return next;
                                            })
                                          }
                                        >
                                          <span aria-hidden="true">
                                            {isExpanded ? "-" : "+"}
                                          </span>
                                          {entry.ghat.name}
                                        </button>
                                        <span className="report-table__location">
                                          {latitude != null &&
                                          longitude != null
                                            ? (
                                                <a
                                                  href={`https://www.google.com/maps?q=${latitude},${longitude}`}
                                                  target="_blank"
                                                  rel="noreferrer"
                                                  aria-label={`Open map for ${entry.ghat.name} at latitude ${latitude}, longitude ${longitude}`}
                                                >
                                                  <Location
                                                    size={16}
                                                    aria-hidden="true"
                                                  />
                                                  <span>Location</span>
                                                  <span className="report-table__coordinates">
                                                    {latitude.toFixed(5)}, {longitude.toFixed(5)}
                                                  </span>
                                                </a>
                                              )
                                            : "Location not recorded"}
                                        </span>
                                      </div>
                                    </th>
                                    <td>{entry.ghat.subDivision || "—"}</td>
                                    <td>{entry.ghat.block || "—"}</td>
                                    <td>
                                      {entry.latestInspection?.occasion ?? "—"}
                                    </td>
                                    <td>
                                      {entry.latestInspection
                                        ? formatDateRange(
                                            entry.latestInspection.periodStart,
                                            entry.latestInspection.periodEnd,
                                          )
                                        : "—"}
                                    </td>
                                    <td>
                                      {!entry.latestInspection ? (
                                        <Tag
                                          className="report-status"
                                          type="red"
                                        >
                                          Inspection needed
                                        </Tag>
                                      ) : entry.pendingDeficiencies.length >
                                        0 ? (
                                        <Tag
                                          className="report-status"
                                          type="red"
                                        >
                                          {entry.pendingDeficiencies.length}{" "}
                                          action
                                          {entry.pendingDeficiencies.length ===
                                          1
                                            ? ""
                                            : "s"}{" "}
                                          pending
                                        </Tag>
                                      ) : (
                                        <Tag
                                          className="report-status"
                                          type="green"
                                        >
                                          Ready for submission
                                        </Tag>
                                      )}
                                    </td>
                                  </tr>
                                  {isExpanded && (
                                    <tr
                                      id={detailsId}
                                      className={`report-table__details-row${isOutsidePage ? " report-table__row--outside-page" : ""}`}
                                    >
                                      <td colSpan={6}>
                                        <div className="report-table__details">
                                          <div className="report-detail-heading">
                                            <div>
                                              <p className="report-detail-heading__eyebrow">
                                                Site profile
                                              </p>
                                              <h2>{entry.ghat.name}</h2>
                                              <p>
                                                {[entry.ghat.district, entry.ghat.subDivision, entry.ghat.block]
                                                  .filter(Boolean)
                                                  .join(" · ") || "Location details unavailable"}
                                              </p>
                                              {entry.latestInspection?.latitude != null &&
                                                entry.latestInspection.longitude != null && (
                                                  <a
                                                    className="report-detail-heading__map-link"
                                                    href={`https://www.google.com/maps?q=${entry.latestInspection.latitude},${entry.latestInspection.longitude}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    aria-label={`Open map for ${entry.ghat.name}`}
                                                  >
                                                    <Location size={16} aria-hidden="true" />
                                                    <span>Open site location</span>
                                                  </a>
                                                )}
                                            </div>
                                            {entry.latestInspection && (
                                              <div className="report-detail-heading__occasion">
                                                <span>Latest occasion</span>
                                                <strong>{entry.latestInspection.occasion}</strong>
                                                <span>
                                                  {formatDateRange(
                                                    entry.latestInspection.periodStart,
                                                    entry.latestInspection.periodEnd,
                                                  )}
                                                </span>
                                              </div>
                                            )}
                                          </div>
                                          <div className="report-ghat__details">
                                            <p>
                                              <span>District</span>
                                              {entry.ghat.district}
                                            </p>
                                            <p>
                                              <span>Nodal Officer</span>
                                              {entry.ghat.nodalOfficerName ||
                                                "—"}
                                              {entry.ghat.nodalOfficerContact &&
                                                ` · ${entry.ghat.nodalOfficerContact}`}
                                            </p>
                                            {entry.latestInspection && (
                                              <p>
                                                <span>Recorded by</span>
                                                {
                                                  entry.latestInspection
                                                    .inspectedBy
                                                }
                                              </p>
                                            )}
                                          </div>
                                          {entry.latestInspection ? (
                                            <>
                                              <Accordion className="report-checklist">
                                                <AccordionItem title="Readiness assessment">
                                                  <p className="report-checklist__hint">
                                                    Status and notes for each
                                                    inspection area
                                                  </p>
                                                  {AREA_KEYS.map((key) => {
                                                    const item =
                                                      entry.latestInspection
                                                        ?.checklist[key];
                                                    if (!item) return null;
                                                    return (
                                                      <div
                                                        className={`report-checklist__item report-checklist__item--${item.status}`}
                                                        key={key}
                                                      >
                                                        <div>
                                                          <strong>
                                                            {AREA_LABELS[key]}
                                                          </strong>
                                                          {item.notes && (
                                                            <p>{item.notes}</p>
                                                          )}
                                                        </div>
                                                        <Tag
                                                          type={
                                                            item.status ===
                                                            "deficiency"
                                                              ? "red"
                                                              : item.status ===
                                                                  "compliant"
                                                                ? "green"
                                                                : "cool-gray"
                                                          }
                                                        >
                                                          {item.status ===
                                                          "deficiency"
                                                            ? "Pending"
                                                            : item.status ===
                                                                "compliant"
                                                              ? "Ready"
                                                              : "Not applicable"}
                                                        </Tag>
                                                      </div>
                                                    );
                                                  })}
                                                </AccordionItem>
                                              </Accordion>
                                              <ReportPhotoGallery
                                                inspectionId={
                                                  entry.latestInspection.id
                                                }
                                                photos={
                                                  entry.latestInspection.photos
                                                }
                                              />
                                              {entry.pendingDeficiencies
                                                .length > 0 && (
                                                <div className="report-deficiencies">
                                                  <h3>
                                                    Deficiencies pending
                                                    rectification
                                                  </h3>
                                                  {entry.pendingDeficiencies.map(
                                                    (item, itemIndex) => (
                                                      <div
                                                        className="report-deficiency report-deficiency--pending"
                                                        key={`${item.category}-${itemIndex}`}
                                                      >
                                                        <strong>
                                                          {
                                                            AREA_LABELS[
                                                              item.category
                                                            ]
                                                          }
                                                        </strong>
                                                        <p>
                                                          {item.description}
                                                        </p>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              )}
                                              {entry.rectifiedDeficiencies
                                                .length > 0 && (
                                                <div className="report-deficiencies">
                                                  <h3>
                                                    Deficiencies rectified
                                                  </h3>
                                                  {entry.rectifiedDeficiencies.map(
                                                    (item, itemIndex) => (
                                                      <div
                                                        className="report-deficiency"
                                                        key={`${item.category}-${itemIndex}`}
                                                      >
                                                        <strong>
                                                          {
                                                            AREA_LABELS[
                                                              item.category
                                                            ]
                                                          }
                                                        </strong>
                                                        <p>
                                                          {item.description}
                                                        </p>
                                                        <p>
                                                          <strong>
                                                            Action taken:
                                                          </strong>{" "}
                                                          {item.actionTaken}
                                                        </p>
                                                      </div>
                                                    ),
                                                  )}
                                                </div>
                                              )}
                                            </>
                                          ) : (
                                            <p className="report-empty">
                                              No joint inspection has been
                                              recorded for this ghat.
                                            </p>
                                          )}
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
                {totalItems > 0 && (
                  <div className="report-pagination">
                    <Pagination
                      id="action-report-pagination"
                      page={currentPage}
                      pageSize={pageSize}
                      pageSizes={[10, 20, 50]}
                      totalItems={totalItems}
                      onChange={({
                        page: nextPage,
                        pageSize: nextPageSize,
                      }) => {
                        setPage(nextPage);
                        setPageSize(nextPageSize);
                      }}
                    />
                  </div>
                )}
              </>
            ) : null}
          </Column>
        </Grid>
      </main>
    </>
  );
}

function ReportPhotoGallery({
  inspectionId,
  photos,
}: {
  inspectionId: string;
  photos: ReportInspectionPhoto[];
}) {
  const router = useRouter();
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(photos.length > 0);
  const [selectedPhoto, setSelectedPhoto] = useState<{
    url: string;
    fileName: string;
  } | null>(null);

  useEffect(() => {
    let isActive = true;
    let wasUnauthorized = false;
    const objectUrls: string[] = [];

    async function loadPhotos() {
      const results = await Promise.all(
        photos.map(async (photo) => {
          try {
            const response = await fetch(
              `${getApiUrl()}/inspections/${inspectionId}/photos/${photo.id}`,
              { credentials: "include" },
            );
            if (response.status === 401) {
              wasUnauthorized = true;
              return {
                id: photo.id,
                error: "Your session has expired. Sign in again to view photos.",
              };
            }
            if (!response.ok) {
              return {
                id: photo.id,
                error: "Unable to load this photo. Reload the report to retry.",
              };
            }

            const url = URL.createObjectURL(await response.blob());
            objectUrls.push(url);
            return { id: photo.id, url };
          } catch {
            return {
              id: photo.id,
              error: "Unable to load this photo. Check your connection and retry.",
            };
          }
        }),
      );

      if (!isActive) return;
      const urls: Record<string, string> = {};
      const errors: Record<string, string> = {};
      for (const result of results) {
        if (typeof result.url === "string") urls[result.id] = result.url;
        if (typeof result.error === "string") errors[result.id] = result.error;
      }
      setPhotoUrls(urls);
      setPhotoErrors(errors);
      setIsLoading(false);
      if (wasUnauthorized) router.replace("/login");
    }

    if (photos.length > 0) void loadPhotos();
    return () => {
      isActive = false;
      objectUrls.forEach(URL.revokeObjectURL);
    };
  }, [inspectionId, photos, router]);

  useEffect(() => {
    if (!selectedPhoto) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedPhoto(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPhoto]);

  return (
    <section className="report-photos" aria-label="Inspection photos">
      <h3>Inspection photos</h3>
      {photos.length === 0 ? (
        <p className="report-empty">No photos attached to this inspection.</p>
      ) : (
        <>
          {isLoading && (
            <p className="report-empty" role="status">
              Loading inspection photos...
            </p>
          )}
          <div className="report-photos__grid">
            {photos.map((photo) => {
              const url = photoUrls[photo.id];
              return (
                <figure className="report-photos__item" key={photo.id}>
                  {url ? (
                    <button
                      className="report-photos__preview"
                      type="button"
                      onClick={() => setSelectedPhoto({ url, fileName: photo.fileName })}
                      style={{ backgroundImage: `url("${url}")` }}
                      aria-label={`View ${photo.fileName}`}
                    />
                  ) : photoErrors[photo.id] ? (
                    <p className="report-photos__error" role="alert">
                      {photoErrors[photo.id]}
                    </p>
                  ) : (
                    <div className="report-photos__placeholder" />
                  )}
                </figure>
              );
            })}
          </div>
          {selectedPhoto && (
            <div
              className="report-photo-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Inspection photo preview"
              onClick={(event) => {
                if (event.target === event.currentTarget) {
                  setSelectedPhoto(null);
                }
              }}
            >
              <div className="report-photo-modal__content">
                <div className="report-photo-modal__toolbar">
                  <Button
                    kind="ghost"
                    renderIcon={Close}
                    iconDescription="Close photo"
                    hasIconOnly
                    onClick={() => setSelectedPhoto(null)}
                  />
                </div>
                <img src={selectedPhoto.url} alt={selectedPhoto.fileName} />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString();
}

function formatDateRange(start: string, end: string) {
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}
