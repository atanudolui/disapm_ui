"use client";

import {
  Add,
  ArrowLeft,
  LocationCurrent,
  Report,
  UserMultiple,
} from "@carbon/icons-react";
import {
  Button,
  Checkbox,
  Column,
  DatePicker,
  DatePickerInput,
  FileUploaderDropContainer,
  FileUploaderItem,
  Grid,
  Header,
  HeaderName,
  InlineNotification,
  Modal,
  OverflowMenu,
  OverflowMenuItem,
  Pagination,
  Search,
  Select,
  SelectItem,
  Tag,
  TextArea,
  TextInput,
  Tile,
} from "@carbon/react";
import { useRouter } from "next/navigation";
import { SuccessToast } from "@/components/success-toast";
import { getApiUrl } from "@/lib/api-url";
import { validateTextFields } from "@/lib/field-validation";
import { type FormEvent, useCallback, useEffect, useState } from "react";

const FESTIVAL_OCCASIONS = ["Chhath Puja", "Durga Puja", "Kali Puja"] as const;
type FestivalOccasion = (typeof FESTIVAL_OCCASIONS)[number];

const SUB_DIVISIONS = ["Contai", "Egra", "Haldia", "Tamluk"] as const;

const BLOCKS = [
  "Bhagwanpur II",
  "Bhagwanpur-I",
  "Chandipur",
  "Contai-I",
  "Contai-III",
  "Contai Municipiality",
  "Deshapran",
  "Egra-I",
  "Egra-II",
  "Egra Municipiality",
  "Haldia Municipiality",
  "Khejuri-I",
  "Khejuri-II",
  "Kolaghat",
  "Mahishadal",
  "Moyna",
  "Nandakumar",
  "Nandigram II",
  "Nandigram-I",
  "Panskura-I",
  "Patashpur-I",
  "Patashpur-II",
  "Ramnagar-I",
  "Ramnagar-II",
  "Sahid Matangini",
  "Sutahata",
  "Tamluk",
  "Tamluk Municipiality",
] as const;

const INSPECTION_AREAS = [
  {
    key: "approachRoadsPathways",
    label: "Approach roads and pathways maintained",
    detail: "Approach roads, pathways, encroachments and debris.",
  },
  {
    key: "ghatLighting",
    label: "Ghat lighting and backup power",
    detail: "Ghat lighting and backup power arrangements.",
  },
  {
    key: "crowdManagement",
    label: "Crowd management",
    detail: "Entry and exit arrangements, barricading and crowd flow.",
  },
  {
    key: "safety",
    label: "Safety",
    detail: "Safe bathing zones, hazards and patrolling.",
  },
  {
    key: "policeWomenPolice",
    label: "Police and women police deployment",
    detail: "Police and women police arrangements.",
  },
  {
    key: "cctvPublicAddress",
    label: "CCTV, public address",
    detail: "CCTV coverage and public address systems.",
  },
  {
    key: "rescueTeam",
    label: "Rescue team",
    detail: "Rescue team, boats, divers and life jackets.",
  },
  {
    key: "drinkingWaterSanitation",
    label: "Public amenities: drinking water and sanitation",
    detail: "Drinking water and sanitation arrangements.",
  },
  {
    key: "womenFacilitiesSignage",
    label: "Public amenities: women’s changing facilities and signage",
    detail: "Women’s changing facilities and signage.",
  },
  {
    key: "emergencyResponse",
    label: "Emergency response",
    detail: "Medical, ambulance and fire safety.",
  },
  {
    key: "cleanliness",
    label: "Cleanliness and upkeep",
    detail:
      "Regular maintenance and waste disposal during and after festivals.",
  },
] as const;

type AreaKey = (typeof INSPECTION_AREAS)[number]["key"];
type WaterbodyType = "river" | "pond";
type ChecklistStatus = "compliant" | "deficiency" | "not_applicable";
type UserRole = "admin" | "user";

function isFestivalOccasion(value: string): value is FestivalOccasion {
  return FESTIVAL_OCCASIONS.some((occasion) => occasion === value);
}

interface ChecklistItem {
  status: ChecklistStatus;
  notes: string;
}

interface InspectionDeficiency {
  category: AreaKey;
  description: string;
  status: "pending" | "rectified";
  actionTaken: string;
}

interface InspectionRecord {
  id: string;
  ghatId: string;
  periodStart: string;
  periodEnd: string;
  latitude: number | null;
  longitude: number | null;
  createdAt?: string;
  updatedAt?: string;
  occasion: string;
  checklist: Record<AreaKey, ChecklistItem>;
  deficiencies: InspectionDeficiency[];
  inspectedBy: string;
  photos: InspectionPhoto[];
}

interface InspectionPhoto {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
}

interface GhatRecord {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  name: string;
  waterbodyType: WaterbodyType;
  district: string;
  subDivision: string;
  block: string;
  nodalOfficerName: string;
  nodalOfficerContact: string;
  inspections: InspectionRecord[];
}

interface UserProfile {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

interface GhatFormState {
  name: string;
  waterbodyType: WaterbodyType;
  district: string;
  subDivision: string;
  block: string;
  nodalOfficerName: string;
  nodalOfficerContact: string;
}

interface InspectionAreaFormState extends ChecklistItem {
  isRectified: boolean;
  actionTaken: string;
}

type InspectionFormState = Record<AreaKey, InspectionAreaFormState>;

function getGhatLastUpdated(ghat: GhatRecord) {
  return Math.max(
    Date.parse(ghat.updatedAt ?? ghat.createdAt ?? "") || 0,
    ...ghat.inspections.map(
      (inspection) =>
        Date.parse(
          inspection.updatedAt ??
            inspection.createdAt ??
            inspection.periodStart,
        ) || 0,
    ),
  );
}

const EMPTY_GHAT_FORM: GhatFormState = {
  name: "",
  waterbodyType: "river",
  district: "Purba Medinipur",
  subDivision: "",
  block: "",
  nodalOfficerName: "",
  nodalOfficerContact: "",
};

function emptyInspectionForm(): InspectionFormState {
  return Object.fromEntries(
    INSPECTION_AREAS.map(({ key }) => [
      key,
      {
        status: "compliant",
        notes: "",
        isRectified: false,
        actionTaken: "",
      },
    ]),
  ) as InspectionFormState;
}

function getErrorMessage(
  body: { message?: string | string[] },
  fallback: string,
) {
  return Array.isArray(body.message)
    ? body.message.join(" ")
    : (body.message ?? fallback);
}

async function readError(response: Response, fallback: string) {
  const body: { message?: string | string[] } = await response
    .json()
    .catch(() => ({}));
  return getErrorMessage(body, fallback);
}

function formatDateRange(start: string, end: string) {
  const formatDate = (value: string) =>
    new Date(`${value}T00:00:00`).toLocaleDateString();
  return start === end
    ? formatDate(start)
    : `${formatDate(start)} – ${formatDate(end)}`;
}

function dateToInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function inputValueToDate(value: string) {
  return value ? new Date(`${value}T00:00:00`) : undefined;
}

export default function GhatsPage() {
  const router = useRouter();
  const [ghats, setGhats] = useState<GhatRecord[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isGhatModalOpen, setIsGhatModalOpen] = useState(false);
  const [editingGhat, setEditingGhat] = useState<GhatRecord | null>(null);
  const [ghatToDelete, setGhatToDelete] = useState<GhatRecord | null>(null);
  const [ghatForm, setGhatForm] = useState<GhatFormState>(EMPTY_GHAT_FORM);
  const [isNodalOfficerRequired, setIsNodalOfficerRequired] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isInspectionModalOpen, setIsInspectionModalOpen] = useState(false);
  const [selectedGhat, setSelectedGhat] = useState<GhatRecord | null>(null);
  const [editingInspection, setEditingInspection] =
    useState<InspectionRecord | null>(null);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [occasion, setOccasion] = useState<FestivalOccasion | "">("");
  const [inspectionPhotos, setInspectionPhotos] = useState<File[]>([]);
  const [photosToRemove, setPhotosToRemove] = useState<string[]>([]);
  const [inspectionForm, setInspectionForm] =
    useState<InspectionFormState>(emptyInspectionForm);
  const [ghatPage, setGhatPage] = useState(1);
  const [ghatPageSize, setGhatPageSize] = useState(10);
  const [ghatSearch, setGhatSearch] = useState("");
  const normalizedGhatSearch = ghatSearch.trim().toLocaleLowerCase();
  const filteredGhats = (
    normalizedGhatSearch
      ? ghats.filter((ghat) =>
          [
            ghat.name,
            ghat.waterbodyType,
            ghat.district,
            ghat.subDivision,
            ghat.block,
            ghat.nodalOfficerName,
            ghat.nodalOfficerContact,
            ghat.inspections[0]?.periodStart,
            ghat.inspections[0]?.periodEnd,
            ghat.inspections[0]?.occasion,
          ]
            .filter(Boolean)
            .some((value) =>
              value!.toLocaleLowerCase().includes(normalizedGhatSearch),
            ),
        )
      : ghats
  )
    .slice()
    .sort(
      (first, second) => getGhatLastUpdated(second) - getGhatLastUpdated(first),
    );
  const ghatPageCount = Math.max(
    1,
    Math.ceil(filteredGhats.length / ghatPageSize),
  );
  const currentGhatPage = Math.min(ghatPage, ghatPageCount);
  const visibleGhats = filteredGhats.slice(
    (currentGhatPage - 1) * ghatPageSize,
    currentGhatPage * ghatPageSize,
  );

  const loadWorkspace = useCallback(async () => {
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
        throw new Error("Unable to load your profile.");
      }
      const loadedProfile: UserProfile = await profileResponse.json();
      const ghatsResponse = await fetch(`${getApiUrl()}/ghats`, {
        credentials: "include",
      });
      if (ghatsResponse.status === 401) {
        router.replace("/login");
        return;
      }
      if (!ghatsResponse.ok) {
        throw new Error(
          await readError(ghatsResponse, "Unable to load ghats."),
        );
      }
      const loadedGhats: GhatRecord[] = await ghatsResponse.json();
      setProfile(loadedProfile);
      setGhats(
        loadedGhats.map((ghat) => ({
          ...ghat,
          inspections: [...(ghat.inspections ?? [])].sort((a, b) =>
            b.periodStart.localeCompare(a.periodStart),
          ),
        })),
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to load the ghat register.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadWorkspace);
  }, [loadWorkspace]);

  useEffect(() => {
    function syncFormWithLocation() {
      if (isLoading) return;
      const params = new URLSearchParams(window.location.search);
      const form = params.get("form");
      if (form === "ghat-create") {
        setEditingGhat(null);
        setEditingInspection(null);
        setSelectedGhat(null);
        setGhatForm(EMPTY_GHAT_FORM);
        setIsNodalOfficerRequired(false);
        setFieldErrors({});
        setError("");
        setIsGhatModalOpen(true);
        setIsInspectionModalOpen(false);
      } else if (form === "ghat-edit") {
        const ghat = ghats.find((item) => item.id === params.get("id"));
        if (ghat) openEditGhat(ghat, false);
      } else if (form === "inspection") {
        const ghat = ghats.find((item) => item.id === params.get("ghatId"));
        const inspectionId = params.get("inspectionId");
        const inspection = ghat?.inspections.find(
          (item) => item.id === inspectionId,
        );
        if (ghat && (!inspectionId || inspection)) {
          openInspection(ghat, inspection, false);
        }
      } else {
        setIsGhatModalOpen(false);
        setIsInspectionModalOpen(false);
        setEditingGhat(null);
        setEditingInspection(null);
      }
    }

    syncFormWithLocation();
    window.addEventListener("popstate", syncFormWithLocation);
    return () => window.removeEventListener("popstate", syncFormWithLocation);
  }, [ghats, isLoading]);

  function openCreateGhat() {
    setIsInspectionModalOpen(false);
    setEditingGhat(null);
    setGhatForm(EMPTY_GHAT_FORM);
    setIsNodalOfficerRequired(false);
    setFieldErrors({});
    setError("");
    window.history.pushState(null, "", "/ghats?form=ghat-create");
    setIsGhatModalOpen(true);
  }

  function openEditGhat(ghat: GhatRecord, updateHistory = true) {
    setIsInspectionModalOpen(false);
    setEditingGhat(ghat);
    setGhatForm({
      name: ghat.name,
      waterbodyType: ghat.waterbodyType,
      district: ghat.district,
      subDivision: ghat.subDivision,
      block: ghat.block,
      nodalOfficerName: ghat.nodalOfficerName,
      nodalOfficerContact: ghat.nodalOfficerContact,
    });
    setIsNodalOfficerRequired(
      Boolean(ghat.nodalOfficerName || ghat.nodalOfficerContact),
    );
    setFieldErrors({});
    setError("");
    if (updateHistory) {
      window.history.pushState(
        null,
        "",
        `/ghats?form=ghat-edit&id=${encodeURIComponent(ghat.id)}`,
      );
    }
    setIsGhatModalOpen(true);
  }

  function closeForm() {
    window.history.replaceState(null, "", "/ghats");
    setIsGhatModalOpen(false);
    setIsInspectionModalOpen(false);
    setEditingGhat(null);
    setEditingInspection(null);
  }

  async function saveGhat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    const nextFieldErrors = validateTextFields({
      "ghat-name": {
        label: "Ghat name",
        value: ghatForm.name,
        required: true,
        minLength: 2,
        maxLength: 160,
      },
      "ghat-district": {
        label: "District",
        value: ghatForm.district,
        required: true,
        minLength: 2,
        maxLength: 120,
      },
      "ghat-subdivision": {
        label: "Sub-division",
        value: ghatForm.subDivision,
        required: true,
      },
      "ghat-block": {
        label: "Block",
        value: ghatForm.block,
        required: true,
      },
      "ghat-nodal-name": {
        label: "Nodal Officer",
        value: ghatForm.nodalOfficerName,
        required: isNodalOfficerRequired,
        minLength: 2,
        maxLength: 160,
      },
      "ghat-nodal-contact": {
        label: "Nodal Officer contact",
        value: ghatForm.nodalOfficerContact,
        required: isNodalOfficerRequired,
        minLength: 3,
        maxLength: 80,
      },
    });
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setIsSaving(true);
    try {
      const response = await fetch(
        editingGhat
          ? `${getApiUrl()}/ghats/${editingGhat.id}`
          : `${getApiUrl()}/ghats`,
        {
          method: editingGhat ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...ghatForm,
            nodalOfficerName: isNodalOfficerRequired
              ? ghatForm.nodalOfficerName
              : "",
            nodalOfficerContact: isNodalOfficerRequired
              ? ghatForm.nodalOfficerContact
              : "",
          }),
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(await readError(response, "Unable to save this ghat."));
      }
      window.history.replaceState(null, "", "/ghats");
      setNotice(editingGhat ? "Ghat details updated." : "Ghat added.");
      setIsGhatModalOpen(false);
      await loadWorkspace();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save this ghat.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteGhat() {
    if (!ghatToDelete) return;
    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`${getApiUrl()}/ghats/${ghatToDelete.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to delete this ghat."),
        );
      }
      setNotice(
        `${ghatToDelete.name} and its inspection history were deleted.`,
      );
      setGhatToDelete(null);
      await loadWorkspace();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to delete this ghat.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function openInspection(
    ghat: GhatRecord,
    inspection?: InspectionRecord,
    updateHistory = true,
  ) {
    setIsGhatModalOpen(false);
    setSelectedGhat(ghat);
    setEditingInspection(inspection ?? null);
    const today = new Date().toISOString().slice(0, 10);
    setPeriodStart(inspection?.periodStart ?? today);
    setPeriodEnd(inspection?.periodEnd ?? today);
    setLatitude(
      inspection?.latitude == null ? "" : String(inspection.latitude),
    );
    setLongitude(
      inspection?.longitude == null ? "" : String(inspection.longitude),
    );
    setLocationError("");
    setInspectionPhotos([]);
    setPhotosToRemove([]);
    setOccasion(
      FESTIVAL_OCCASIONS.find(
        (festival) => festival === inspection?.occasion,
      ) ?? "",
    );
    const form = emptyInspectionForm();
    if (inspection) {
      for (const { key } of INSPECTION_AREAS) {
        const checklistItem = inspection.checklist?.[key];
        const deficiency = inspection.deficiencies?.find(
          (item) => item.category === key,
        );
        form[key] = {
          status: checklistItem?.status ?? "compliant",
          notes: checklistItem?.notes ?? "",
          isRectified: deficiency?.status === "rectified",
          actionTaken: deficiency?.actionTaken ?? "",
        };
      }
    }
    setInspectionForm(form);
    setFieldErrors({});
    setError("");
    if (updateHistory) {
      const query = new URLSearchParams({
        form: "inspection",
        ghatId: ghat.id,
      });
      if (inspection) query.set("inspectionId", inspection.id);
      window.history.pushState(null, "", `/ghats?${query.toString()}`);
    }
    setIsInspectionModalOpen(true);
  }

  function useCurrentLocation() {
    setLocationError("");
    if (!window.isSecureContext) {
      setLocationError(
        "Current location requires a secure connection (HTTPS) or localhost. Open the app over HTTPS and try again.",
      );
      return;
    }
    if (!navigator.geolocation) {
      setLocationError("Location access is not available in this browser.");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLatitude(String(coords.latitude));
        setLongitude(String(coords.longitude));
        setFieldErrors((current) => ({
          ...current,
          "inspection-latitude": "",
          "inspection-longitude": "",
        }));
        setIsGettingLocation(false);
      },
      (geoError) => {
        setLocationError(
          geoError.code === geoError.PERMISSION_DENIED
            ? "Location permission was denied. Allow location access for this site in your browser or device settings, then try again."
            : geoError.code === geoError.POSITION_UNAVAILABLE
              ? "Your device could not determine a location. Check that location services are enabled and try again."
              : geoError.code === geoError.TIMEOUT
                ? "The location request timed out. Check that location services are enabled and try again."
                : "Unable to get your current location. Try again.",
        );
        setIsGettingLocation(false);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 30_000 },
    );
  }

  async function saveInspection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedGhat) return;
    setError("");
    setNotice("");
    const nextFieldErrors = validateTextFields({
      ...Object.fromEntries(
        INSPECTION_AREAS.flatMap(({ key }) => {
          const area = inspectionForm[key];
          return [
            [
              `inspection-notes-${key}`,
              {
                label:
                  area.status === "deficiency"
                    ? "Deficiency / findings"
                    : "Arrangements made / notes",
                value: area.notes,
                required: area.status === "deficiency",
                ...(area.status === "deficiency"
                  ? { minLength: 3, maxLength: 1000 }
                  : { maxLength: 2000 }),
              },
            ],
            ...(area.isRectified
              ? [
                  [
                    `inspection-action-${key}`,
                    {
                      label: "Action taken",
                      value: area.actionTaken,
                      required: true,
                      maxLength: 2000,
                    },
                  ],
                ]
              : []),
          ];
        }),
      ),
    });
    if (!isFestivalOccasion(occasion)) {
      nextFieldErrors["inspection-occasion"] = "Select a festival or occasion.";
    }
    if (!periodStart || Number.isNaN(Date.parse(`${periodStart}T00:00:00`))) {
      nextFieldErrors["inspection-period-start"] =
        "Enter a valid period start date.";
    }
    if (!periodEnd || Number.isNaN(Date.parse(`${periodEnd}T00:00:00`))) {
      nextFieldErrors["inspection-period-end"] =
        "Enter a valid period end date.";
    } else if (periodStart && periodEnd < periodStart) {
      nextFieldErrors["inspection-period-end"] =
        "End date must be on or after the start date.";
    }
    const latitudeValue = Number(latitude);
    if (
      !latitude.trim() ||
      !Number.isFinite(latitudeValue) ||
      latitudeValue < -90 ||
      latitudeValue > 90
    ) {
      nextFieldErrors["inspection-latitude"] =
        "Enter a latitude between -90 and 90.";
    }
    const longitudeValue = Number(longitude);
    if (
      !longitude.trim() ||
      !Number.isFinite(longitudeValue) ||
      longitudeValue < -180 ||
      longitudeValue > 180
    ) {
      nextFieldErrors["inspection-longitude"] =
        "Enter a longitude between -180 and 180.";
    }
    if (
      (editingInspection?.photos.length ?? 0) -
        photosToRemove.length +
        inspectionPhotos.length >
      2
    ) {
      nextFieldErrors["inspection-photos"] =
        "An inspection can have no more than 2 photos.";
    }
    setFieldErrors(nextFieldErrors);
    if (Object.keys(nextFieldErrors).length > 0) return;

    setIsSaving(true);
    const checklist = Object.fromEntries(
      INSPECTION_AREAS.map(({ key }) => [
        key,
        {
          status: inspectionForm[key].status,
          notes: inspectionForm[key].notes.trim(),
        },
      ]),
    );
    const deficiencies = INSPECTION_AREAS.filter(
      ({ key }) => inspectionForm[key].status === "deficiency",
    ).map(({ key }) => ({
      category: key,
      description: inspectionForm[key].notes.trim(),
      status: inspectionForm[key].isRectified ? "rectified" : "pending",
      actionTaken: inspectionForm[key].actionTaken.trim(),
    }));
    try {
      const formData = new FormData();
      formData.append(
        "inspection",
        JSON.stringify({
          periodStart,
          periodEnd,
          occasion,
          latitude: latitudeValue,
          longitude: longitudeValue,
          checklist,
          deficiencies,
          ...(editingInspection ? { removePhotoIds: photosToRemove } : {}),
        }),
      );
      inspectionPhotos.forEach((photo) => formData.append("photos", photo));
      const response = await fetch(
        editingInspection
          ? `${getApiUrl()}/inspections/${editingInspection.id}`
          : `${getApiUrl()}/ghats/${selectedGhat.id}/inspections`,
        {
          method: editingInspection ? "PATCH" : "POST",
          credentials: "include",
          body: formData,
        },
      );
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to save this inspection."),
        );
      }
      window.history.replaceState(null, "", "/ghats");
      setNotice(
        editingInspection ? "Inspection updated." : "Inspection recorded.",
      );
      setIsInspectionModalOpen(false);
      await loadWorkspace();
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to save this inspection.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function viewInspectionPhoto(
    inspectionId: string,
    photo: InspectionPhoto,
  ) {
    const photoWindow = window.open("about:blank", "_blank");
    if (!photoWindow) {
      setError("Allow pop-ups to view inspection photos.");
      return;
    }

    try {
      const response = await fetch(
        `${getApiUrl()}/inspections/${inspectionId}/photos/${photo.id}`,
        { credentials: "include" },
      );
      if (response.status === 401) {
        photoWindow.close();
        router.replace("/login");
        return;
      }
      if (!response.ok) {
        throw new Error(
          await readError(response, "Unable to open this inspection photo."),
        );
      }
      const photoUrl = URL.createObjectURL(await response.blob());
      photoWindow.location.href = photoUrl;
      window.setTimeout(() => URL.revokeObjectURL(photoUrl), 60_000);
    } catch (caughtError) {
      photoWindow.close();
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "Unable to open this inspection photo.",
      );
    }
  }

  async function handleLogout() {
    try {
      const response = await fetch(`${getApiUrl()}/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok)
        throw new Error("Unable to sign out. Please try again.");
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
      <Header className="app-shell-header" aria-label="Puja Readiness Portal">
        <HeaderName href="/dashboard" prefix="">
          Puja Readiness Portal
        </HeaderName>
        <nav className="app-header__nav" aria-label="Main navigation">
          <Button kind="ghost" href="/dashboard">
            Dashboard
          </Button>
          <Button kind="ghost" href="/ghats" aria-current="page">
            Ghats
          </Button>
          <Button kind="ghost" href="/reports" renderIcon={Report}>
            Action Taken Report
          </Button>
          {profile?.role === "admin" && (
            <Button kind="ghost" href="/users" renderIcon={UserMultiple}>
              Users
            </Button>
          )}
        </nav>
        <div className="app-header__actions">
          {profile && (
            <span className="app-header__user" title={profile.username}>
              {profile.name}
            </span>
          )}
          <Button kind="ghost" renderIcon={ArrowLeft} onClick={handleLogout}>
            Sign out
          </Button>
        </div>
      </Header>

      {notice && (
        <SuccessToast message={notice} onClose={() => setNotice("")} />
      )}

      {!isGhatModalOpen && !isInspectionModalOpen && (
        <main className="users-main" id="main-content">
          <Grid>
            <Column sm={4} md={8} lg={16}>
              <div className="users-heading">
                <div>
                  <p className="dashboard-eyebrow">FIELD OPERATIONS</p>
                  <h1 className="dashboard-title">Ghat Readiness</h1>
                  <p className="dashboard-description">
                    Maintain ghat details, coordinate inspections and track
                    safety arrangements throughout the year.
                  </p>
                </div>
              </div>
              {error && !isGhatModalOpen && !isInspectionModalOpen && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="Ghat register error"
                  subtitle={error}
                />
              )}
            </Column>
            <Column sm={4} md={8} lg={16}>
              <Tile className="users-table-tile">
                {isLoading ? (
                  <p role="status">Loading ghat register...</p>
                ) : ghats.length === 0 ? (
                  <div className="users-empty">
                    <h2>No ghats have been added</h2>
                    <p>
                      Add a river or pond ghat to begin recording readiness
                      inspections.
                    </p>
                    <Button renderIcon={Add} onClick={openCreateGhat}>
                      Add first ghat
                    </Button>
                  </div>
                ) : (
                  <div className="users-table-wrapper">
                    <div className="users-table-toolbar">
                      <Search
                        className="table-search"
                        id="ghats-search"
                        labelText="Search ghats"
                        placeholder="Search by ghat, district, officer..."
                        size="lg"
                        value={ghatSearch}
                        onChange={(event) => {
                          setGhatSearch(event.currentTarget.value);
                          setGhatPage(1);
                        }}
                        onClear={() => {
                          setGhatSearch("");
                          setGhatPage(1);
                        }}
                      />
                      <Button renderIcon={Add} onClick={openCreateGhat}>
                        Add Ghat
                      </Button>
                    </div>
                    {filteredGhats.length === 0 ? (
                      <div className="users-empty">
                        <h2>No ghats match your search</h2>
                        <p>Try a different ghat, district, or officer.</p>
                      </div>
                    ) : (
                      <>
                        <table className="cds--data-table cds--data-table--zebra users-table">
                          <thead>
                            <tr>
                              <th scope="col">Ghat</th>
                              <th scope="col">District</th>
                              <th scope="col">Sub-Division</th>
                              <th scope="col">Block</th>
                              <th scope="col">Nodal Officer</th>
                              <th scope="col">Latest inspection</th>
                              <th scope="col">Readiness</th>
                              <th scope="col">
                                <span className="visually-hidden">Actions</span>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleGhats.map((ghat) => {
                              const latest = ghat.inspections[0];
                              const pending =
                                latest?.deficiencies.filter(
                                  (item) => item.status === "pending",
                                ).length ?? 0;
                              const deficientAreas = latest
                                ? INSPECTION_AREAS.filter(
                                    ({ key }) =>
                                      latest.checklist[key]?.status ===
                                      "deficiency",
                                  ).length
                                : 0;
                              return (
                                <tr key={ghat.id}>
                                  <td>
                                    <strong>{ghat.name}</strong>
                                    <div className="ghat-table__meta">
                                      {ghat.waterbodyType === "river"
                                        ? "River"
                                        : "Pond"}
                                    </div>
                                  </td>
                                  <td>{ghat.district}</td>
                                  <td>{ghat.subDivision || "—"}</td>
                                  <td>{ghat.block || "—"}</td>
                                  <td>
                                    {ghat.nodalOfficerName}
                                    <div className="ghat-table__meta">
                                      {ghat.nodalOfficerContact}
                                    </div>
                                  </td>
                                  <td>
                                    {latest ? (
                                      <>
                                        {formatDateRange(
                                          latest.periodStart,
                                          latest.periodEnd,
                                        )}
                                        <div className="ghat-table__meta">
                                          {latest.occasion}
                                        </div>
                                        {latest.latitude != null &&
                                          latest.longitude != null && (
                                            <div className="ghat-table__meta">
                                              {latest.latitude},{" "}
                                              {latest.longitude}
                                            </div>
                                          )}
                                      </>
                                    ) : (
                                      <span className="ghat-table__meta">
                                        Not inspected
                                      </span>
                                    )}
                                  </td>
                                  <td>
                                    {!latest ? (
                                      <Tag type="cool-gray">Not inspected</Tag>
                                    ) : pending > 0 ? (
                                      <Tag type="red">{pending} pending</Tag>
                                    ) : deficientAreas > 0 ? (
                                      <Tag type="green">
                                        All tracked items rectified
                                      </Tag>
                                    ) : (
                                      <Tag type="green">Ready</Tag>
                                    )}
                                  </td>
                                  <td className="users-table__actions">
                                    <OverflowMenu
                                      aria-label={`Actions for ${ghat.name}`}
                                      iconDescription={`Actions for ${ghat.name}`}
                                      size="sm"
                                    >
                                      <OverflowMenuItem
                                        itemText={
                                          latest
                                            ? "Update Inspection"
                                            : "Inspect"
                                        }
                                        onClick={() =>
                                          openInspection(ghat, latest)
                                        }
                                      />
                                      <OverflowMenuItem
                                        itemText="Edit"
                                        onClick={() => openEditGhat(ghat)}
                                      />
                                      <OverflowMenuItem
                                        itemText="Delete"
                                        isDelete
                                        hasDivider
                                        onClick={() => setGhatToDelete(ghat)}
                                      />
                                    </OverflowMenu>
                                    {ghat.inspections.length > 1 && (
                                      <details className="ghat-history">
                                        <summary>
                                          {ghat.inspections.length - 1} earlier
                                          inspection
                                          {ghat.inspections.length === 2
                                            ? ""
                                            : "s"}
                                        </summary>
                                        {ghat.inspections
                                          .slice(1)
                                          .map((inspection) => (
                                            <div
                                              className="ghat-history__item"
                                              key={inspection.id}
                                            >
                                              <span>
                                                {formatDateRange(
                                                  inspection.periodStart,
                                                  inspection.periodEnd,
                                                )}{" "}
                                                · {inspection.occasion}
                                              </span>
                                              <Button
                                                kind="ghost"
                                                size="sm"
                                                onClick={() =>
                                                  openInspection(
                                                    ghat,
                                                    inspection,
                                                  )
                                                }
                                              >
                                                Edit
                                              </Button>
                                            </div>
                                          ))}
                                      </details>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <Pagination
                          id="ghats-pagination"
                          page={currentGhatPage}
                          pageSize={ghatPageSize}
                          pageSizes={[10, 20, 50]}
                          totalItems={filteredGhats.length}
                          onChange={({ page, pageSize }) => {
                            setGhatPage(page);
                            setGhatPageSize(pageSize);
                          }}
                        />
                      </>
                    )}
                  </div>
                )}
              </Tile>
            </Column>
          </Grid>
        </main>
      )}

      {isGhatModalOpen && (
        <main className="users-main form-page" id="main-content">
          <Grid>
            <Column sm={4} md={8} lg={10} className="form-page__column">
              <div className="users-heading form-page__heading">
                <div>
                  <p className="dashboard-eyebrow">GHAT REGISTER</p>
                  <h1 className="dashboard-title">
                    {editingGhat ? "Edit ghat" : "Add ghat"}
                  </h1>
                  <p className="dashboard-description">
                    Enter the ghat and nodal officer details.
                  </p>
                </div>
                <Button
                  kind="secondary"
                  renderIcon={ArrowLeft}
                  onClick={closeForm}
                >
                  Back to ghats
                </Button>
              </div>
              {error && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="Unable to save ghat"
                  subtitle={error}
                />
              )}
              <form
                className="ghat-form form-page__surface"
                onSubmit={(event) => void saveGhat(event)}
              >
                <TextInput
                  id="ghat-name"
                  labelText="Ghat name"
                  invalid={Boolean(fieldErrors["ghat-name"])}
                  invalidText={fieldErrors["ghat-name"]}
                  value={ghatForm.name}
                  onChange={(event) => {
                    setGhatForm({
                      ...ghatForm,
                      name: event.currentTarget.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      "ghat-name": "",
                    }));
                  }}
                  maxLength={160}
                />
                <Select
                  id="ghat-waterbody"
                  labelText="Waterbody type"
                  value={ghatForm.waterbodyType}
                  onChange={(event) =>
                    setGhatForm({
                      ...ghatForm,
                      waterbodyType:
                        event.currentTarget.value === "pond" ? "pond" : "river",
                    })
                  }
                >
                  <SelectItem value="pond" text="Pond" />
                  <SelectItem value="river" text="River" />
                </Select>
                <TextInput
                  id="ghat-district"
                  labelText="District"
                  invalid={Boolean(fieldErrors["ghat-district"])}
                  invalidText={fieldErrors["ghat-district"]}
                  value={ghatForm.district}
                  onChange={(event) => {
                    setGhatForm({
                      ...ghatForm,
                      district: event.currentTarget.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      "ghat-district": "",
                    }));
                  }}
                  readOnly
                  maxLength={120}
                />
                <Select
                  id="ghat-subdivision"
                  labelText="Sub-Division"
                  invalid={Boolean(fieldErrors["ghat-subdivision"])}
                  invalidText={fieldErrors["ghat-subdivision"]}
                  value={ghatForm.subDivision}
                  onChange={(event) => {
                    setGhatForm({
                      ...ghatForm,
                      subDivision: event.currentTarget.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      "ghat-subdivision": "",
                    }));
                  }}
                >
                  <SelectItem value="" text="Select a sub-division" />
                  {SUB_DIVISIONS.map((subDivision) => (
                    <SelectItem
                      key={subDivision}
                      value={subDivision}
                      text={subDivision}
                    />
                  ))}
                </Select>
                <Select
                  id="ghat-block"
                  labelText="Block"
                  invalid={Boolean(fieldErrors["ghat-block"])}
                  invalidText={fieldErrors["ghat-block"]}
                  value={ghatForm.block}
                  onChange={(event) => {
                    setGhatForm({
                      ...ghatForm,
                      block: event.currentTarget.value,
                    });
                    setFieldErrors((current) => ({
                      ...current,
                      "ghat-block": "",
                    }));
                  }}
                >
                  <SelectItem value="" text="Select a block" />
                  {BLOCKS.map((block) => (
                    <SelectItem key={block} value={block} text={block} />
                  ))}
                </Select>
                <div className="ghat-form__nodal-officer">
                  <Checkbox
                    id="ghat-nodal-required"
                    labelText="Is Nodal Officer required"
                    checked={isNodalOfficerRequired}
                    onChange={(_event, { checked }) => {
                      setIsNodalOfficerRequired(checked);
                      if (!checked) {
                        setGhatForm({
                          ...ghatForm,
                          nodalOfficerName: "",
                          nodalOfficerContact: "",
                        });
                        setFieldErrors((current) => ({
                          ...current,
                          "ghat-nodal-name": "",
                          "ghat-nodal-contact": "",
                        }));
                      }
                    }}
                  />
                  {isNodalOfficerRequired && (
                    <>
                      <TextInput
                        id="ghat-nodal-name"
                        labelText="Nodal Officer"
                        invalid={Boolean(fieldErrors["ghat-nodal-name"])}
                        invalidText={fieldErrors["ghat-nodal-name"]}
                        value={ghatForm.nodalOfficerName}
                        onChange={(event) => {
                          setGhatForm({
                            ...ghatForm,
                            nodalOfficerName: event.currentTarget.value,
                          });
                          setFieldErrors((current) => ({
                            ...current,
                            "ghat-nodal-name": "",
                          }));
                        }}
                        maxLength={160}
                      />
                      <TextInput
                        id="ghat-nodal-contact"
                        labelText="Nodal Officer contact"
                        invalid={Boolean(fieldErrors["ghat-nodal-contact"])}
                        invalidText={fieldErrors["ghat-nodal-contact"]}
                        value={ghatForm.nodalOfficerContact}
                        onChange={(event) => {
                          setGhatForm({
                            ...ghatForm,
                            nodalOfficerContact: event.currentTarget.value,
                          });
                          setFieldErrors((current) => ({
                            ...current,
                            "ghat-nodal-contact": "",
                          }));
                        }}
                        maxLength={80}
                      />
                    </>
                  )}
                </div>
                <div className="form-page__actions">
                  <Button kind="secondary" type="button" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save ghat"}
                  </Button>
                </div>
              </form>
            </Column>
          </Grid>
        </main>
      )}

      {isInspectionModalOpen && (
        <main className="users-main form-page" id="main-content">
          <Grid>
            <Column sm={4} md={8} lg={14} className="form-page__column">
              <div className="users-heading form-page__heading">
                <div>
                  <p className="dashboard-eyebrow">READINESS INSPECTION</p>
                  <h1 className="dashboard-title">
                    {editingInspection
                      ? "Update inspection"
                      : "Record inspection"}
                  </h1>
                  <p className="dashboard-description">
                    Complete the festival details and readiness checklist.
                  </p>
                </div>
                <Button
                  kind="secondary"
                  renderIcon={ArrowLeft}
                  onClick={closeForm}
                >
                  Back to ghats
                </Button>
              </div>
              {error && (
                <InlineNotification
                  kind="error"
                  lowContrast
                  title="Unable to save inspection"
                  subtitle={error}
                />
              )}
              <form
                className="inspection-form form-page__surface"
                onSubmit={(event) => void saveInspection(event)}
              >
                <p className="inspection-form__ghat">
                  {selectedGhat?.name} · {selectedGhat?.district}
                </p>
                <div className="inspection-form__event-details">
                  <Select
                    id="inspection-occasion"
                    labelText="Festival / occasion"
                    value={occasion}
                    invalid={Boolean(fieldErrors["inspection-occasion"])}
                    invalidText={fieldErrors["inspection-occasion"]}
                    onChange={(event) => {
                      const value = event.currentTarget.value;
                      setOccasion(isFestivalOccasion(value) ? value : "");
                      setFieldErrors((current) => ({
                        ...current,
                        "inspection-occasion": "",
                      }));
                    }}
                  >
                    <SelectItem value="" text="Select a festival or occasion" />
                    {FESTIVAL_OCCASIONS.map((festival) => (
                      <SelectItem
                        key={festival}
                        value={festival}
                        text={festival}
                      />
                    ))}
                  </Select>
                  <fieldset className="inspection-period">
                    {/* <legend>Period for Festival / occasion</legend> */}
                    <DatePicker
                      datePickerType="range"
                      dateFormat="m/d/Y"
                      value={[periodStart, periodEnd]
                        .map(inputValueToDate)
                        .filter((date): date is Date => date !== undefined)}
                      onChange={(dates) => {
                        setPeriodStart(
                          dates[0] ? dateToInputValue(dates[0]) : "",
                        );
                        setPeriodEnd(
                          dates[1] ? dateToInputValue(dates[1]) : "",
                        );
                        setFieldErrors((current) => ({
                          ...current,
                          "inspection-period-start": "",
                          "inspection-period-end": "",
                        }));
                      }}
                    >
                      <DatePickerInput
                        id="inspection-period-start"
                        labelText="Period From"
                        placeholder="mm/dd/yyyy"
                        invalid={Boolean(
                          fieldErrors["inspection-period-start"],
                        )}
                        invalidText={fieldErrors["inspection-period-start"]}
                      />
                      <DatePickerInput
                        id="inspection-period-end"
                        labelText="Period To"
                        placeholder="mm/dd/yyyy"
                        invalid={Boolean(fieldErrors["inspection-period-end"])}
                        invalidText={fieldErrors["inspection-period-end"]}
                      />
                    </DatePicker>
                  </fieldset>
                </div>
                <div className="inspection-form__event-details">
                  <TextInput
                    id="inspection-latitude"
                    type="number"
                    step="any"
                    min="-90"
                    max="90"
                    labelText="Latitude"
                    invalid={Boolean(fieldErrors["inspection-latitude"])}
                    invalidText={fieldErrors["inspection-latitude"]}
                    value={latitude}
                    onChange={(event) => {
                      setLatitude(event.currentTarget.value);
                      setLocationError("");
                      setFieldErrors((current) => ({
                        ...current,
                        "inspection-latitude": "",
                      }));
                    }}
                  />
                  <TextInput
                    id="inspection-longitude"
                    type="number"
                    step="any"
                    min="-180"
                    max="180"
                    labelText="Longitude"
                    invalid={Boolean(fieldErrors["inspection-longitude"])}
                    invalidText={fieldErrors["inspection-longitude"]}
                    value={longitude}
                    onChange={(event) => {
                      setLongitude(event.currentTarget.value);
                      setLocationError("");
                      setFieldErrors((current) => ({
                        ...current,
                        "inspection-longitude": "",
                      }));
                    }}
                  />
                </div>
                <div className="inspection-form__location">
                  <Button
                    kind="tertiary"
                    size="sm"
                    type="button"
                    renderIcon={LocationCurrent}
                    disabled={isGettingLocation || isSaving}
                    onClick={useCurrentLocation}
                  >
                    {isGettingLocation
                      ? "Getting location..."
                      : "Use current location"}
                  </Button>
                  {isGettingLocation && (
                    <p
                      className="inspection-form__location-status"
                      role="status"
                    >
                      Waiting for location permission and GPS...
                    </p>
                  )}
                  {locationError && (
                    <p className="cds--form-requirement" role="alert">
                      {locationError}
                    </p>
                  )}
                </div>
                <div className="inspection-form__photos">
                  <p className="cds--label">Inspection photos</p>
                  <FileUploaderDropContainer
                    id="inspection-photos"
                    accept={["image/jpeg", "image/png", "image/webp"]}
                    multiple
                    labelText="Drag and drop photos here or click to upload"
                    maxFileSize={2 * 1024 * 1024}
                    disabled={
                      (editingInspection?.photos.length ?? 0) -
                        photosToRemove.length +
                        inspectionPhotos.length >=
                      2
                    }
                    aria-describedby={
                      fieldErrors["inspection-photos"]
                        ? "inspection-photos-help inspection-photos-error"
                        : "inspection-photos-help"
                    }
                    onAddFiles={(_, { addedFiles }) => {
                      const availableSlots =
                        2 -
                        ((editingInspection?.photos.length ?? 0) -
                          photosToRemove.length) -
                        inspectionPhotos.length;
                      const validPhotos = addedFiles.filter(
                        (photo) =>
                          !photo.invalidFileType &&
                          ["image/jpeg", "image/png", "image/webp"].includes(
                            photo.type,
                          ) &&
                          photo.size <= 2 * 1024 * 1024,
                      );
                      if (
                        validPhotos.length !== addedFiles.length ||
                        addedFiles.length > availableSlots
                      ) {
                        setFieldErrors((current) => ({
                          ...current,
                          "inspection-photos":
                            "Choose up to 2 JPEG, PNG, or WebP photos total, each no larger than 2 MB.",
                        }));
                      } else {
                        setInspectionPhotos((current) => [
                          ...current,
                          ...validPhotos,
                        ]);
                        setFieldErrors((current) => ({
                          ...current,
                          "inspection-photos": "",
                        }));
                      }
                    }}
                  />
                  <p
                    className="inspection-photos__help"
                    id="inspection-photos-help"
                  >
                    JPEG, PNG, or WebP. Up to 2 photos, 2 MB each.
                  </p>
                  {((editingInspection?.photos.length ?? 0) -
                    photosToRemove.length >
                    0 ||
                    inspectionPhotos.length > 0) && (
                    <ul
                      className="inspection-photos__list"
                      aria-label="Attached inspection photos"
                    >
                      {editingInspection?.photos
                        .filter((photo) => !photosToRemove.includes(photo.id))
                        .map((photo) => (
                          <li
                            className="inspection-photos__item"
                            key={photo.id}
                          >
                            <FileUploaderItem
                              name={photo.fileName}
                              status="complete"
                              iconDescription="Photo attached"
                            />
                            <Button
                              kind="ghost"
                              size="sm"
                              onClick={() =>
                                void viewInspectionPhoto(
                                  editingInspection.id,
                                  photo,
                                )
                              }
                            >
                              View
                            </Button>
                            <Button
                              kind="danger--tertiary"
                              size="sm"
                              type="button"
                              onClick={() =>
                                setPhotosToRemove((current) => [
                                  ...current,
                                  photo.id,
                                ])
                              }
                            >
                              Remove
                            </Button>
                          </li>
                        ))}
                      {inspectionPhotos.map((photo, index) => (
                        <li
                          className="inspection-photos__item"
                          key={`${photo.name}-${index}`}
                        >
                          <FileUploaderItem
                            name={photo.name}
                            status="edit"
                            uuid={String(index)}
                            iconDescription="Remove photo"
                            onDelete={(_, { uuid }) => {
                              setInspectionPhotos((current) =>
                                current.filter(
                                  (_, photoIndex) =>
                                    String(photoIndex) !== uuid,
                                ),
                              );
                              setFieldErrors((current) => ({
                                ...current,
                                "inspection-photos": "",
                              }));
                            }}
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                  {fieldErrors["inspection-photos"] && (
                    <p
                      className="cds--form-requirement"
                      id="inspection-photos-error"
                      role="alert"
                    >
                      {fieldErrors["inspection-photos"]}
                    </p>
                  )}
                </div>
                <h3 className="inspection-form__section-title">
                  Readiness checklist
                </h3>
                <div className="inspection-checklist">
                  {INSPECTION_AREAS.map(({ key, label, detail }) => {
                    const area = inspectionForm[key];
                    return (
                      <section className="inspection-area" key={key}>
                        <h4>{label}</h4>
                        <p>{detail}</p>
                        <Select
                          id={`inspection-status-${key}`}
                          labelText="Assessment"
                          value={area.status}
                          onChange={(event) =>
                            setInspectionForm({
                              ...inspectionForm,
                              [key]: {
                                ...area,
                                status: event.currentTarget
                                  .value as ChecklistStatus,
                              },
                            })
                          }
                        >
                          <SelectItem
                            value="not_applicable"
                            text="Not applicable"
                          />
                          <SelectItem value="deficiency" text="Pending" />
                          <SelectItem value="compliant" text="Ready" />
                        </Select>
                        <TextArea
                          id={`inspection-notes-${key}`}
                          labelText={
                            area.status === "deficiency"
                              ? "Deficiency / findings"
                              : "Arrangements made / notes"
                          }
                          invalid={Boolean(
                            fieldErrors[`inspection-notes-${key}`],
                          )}
                          invalidText={fieldErrors[`inspection-notes-${key}`]}
                          value={area.notes}
                          onChange={(event) => {
                            setInspectionForm({
                              ...inspectionForm,
                              [key]: {
                                ...area,
                                notes: event.currentTarget.value,
                              },
                            });
                            setFieldErrors((current) => ({
                              ...current,
                              [`inspection-notes-${key}`]: "",
                            }));
                          }}
                          rows={2}
                          maxLength={area.status === "deficiency" ? 1000 : 2000}
                        />
                        {area.status === "deficiency" && (
                          <>
                            <Checkbox
                              id={`inspection-rectified-${key}`}
                              labelText="This deficiency has been rectified"
                              checked={area.isRectified}
                              onChange={(_event, { checked }) =>
                                setInspectionForm({
                                  ...inspectionForm,
                                  [key]: { ...area, isRectified: checked },
                                })
                              }
                            />
                            {area.isRectified && (
                              <TextArea
                                id={`inspection-action-${key}`}
                                labelText="Action taken"
                                invalid={Boolean(
                                  fieldErrors[`inspection-action-${key}`],
                                )}
                                invalidText={
                                  fieldErrors[`inspection-action-${key}`]
                                }
                                value={area.actionTaken}
                                onChange={(event) => {
                                  setInspectionForm({
                                    ...inspectionForm,
                                    [key]: {
                                      ...area,
                                      actionTaken: event.currentTarget.value,
                                    },
                                  });
                                  setFieldErrors((current) => ({
                                    ...current,
                                    [`inspection-action-${key}`]: "",
                                  }));
                                }}
                                rows={2}
                                maxLength={2000}
                              />
                            )}
                          </>
                        )}
                      </section>
                    );
                  })}
                </div>
                <div className="form-page__actions">
                  <Button kind="secondary" type="button" onClick={closeForm}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? "Saving..." : "Save inspection"}
                  </Button>
                </div>
              </form>
            </Column>
          </Grid>
        </main>
      )}

      <Modal
        open={ghatToDelete !== null}
        modalHeading="Delete ghat?"
        primaryButtonText={isSaving ? "Deleting..." : "Delete ghat"}
        secondaryButtonText="Cancel"
        danger
        primaryButtonDisabled={isSaving}
        onRequestClose={() => setGhatToDelete(null)}
        onRequestSubmit={() => void deleteGhat()}
      >
        <p>
          This permanently deletes <strong>{ghatToDelete?.name}</strong> and all
          associated inspection and deficiency records.
        </p>
      </Modal>
    </>
  );
}
