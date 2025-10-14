import React, { useEffect, useMemo, useState } from 'react';
import { jsPDF } from 'jspdf';
import { supabase } from '../supabase/client';
import type { User } from '../types';
import {
  InspectionItemLike,
  isFailureAnswer,
  normaliseAnswer,
} from '../utils/inspection';

interface InspectionResponseRow {
  condition: string | null;
  item?:
    | {
        question: string | null;
        category: string | null;
        correct_answer: string | null;
      }
    | null;
}

interface VehicleInfo {
  registration_number: string | null;
  make: string | null;
  model: string | null;
}

interface DriverInfo {
  full_name: string | null;
  email: string | null;
}

interface InspectionWithRelations {
  id: string;
  inspection_date: string | null;
  site: string | null;
  overall_status: string | null;
  driver: DriverInfo | null;
  vehicle: VehicleInfo | null;
  responses: InspectionResponseRow[] | null;
}

interface InspectionSummary {
  id: string;
  inspectionDate: string | null;
  formattedDate: string;
  site: string | null;
  vehicleLabel: string;
  totalItems: number;
  failedItems: number;
  overallStatus: string | null;
}

interface InspectionDetail {
  id: string;
  inspection_date: string | null;
  site: string | null;
  overall_status: string | null;
  odometer: number | null;
  remarks: string | null;
  vehicle: {
    registration_number: string | null;
    make: string | null;
    model: string | null;
  } | null;
  driver: {
    full_name: string | null;
    email: string | null;
  } | null;
  responses:
    | {
        id: string;
        condition: string | null;
        notes: string | null;
        photo_url: string | null;
        storage_bucket: string | null;
        item: {
          question: string | null;
          category: string | null;
          correct_answer: string | null;
        } | null;
      }[]
    | null;
}

interface MyInspectionsProps {
  user: User;
  showSuccessToast: boolean;
  onDismissToast: () => void;
  onCreateNew: () => void;
}

const asItemLike = (
  item?: { question: string | null; category: string | null; correct_answer: string | null } | null
): InspectionItemLike => ({
  question: item?.question ?? null,
  category: item?.category ?? null,
  correct_answer: item?.correct_answer ?? null,
});

const MyInspections: React.FC<MyInspectionsProps> = ({
  user,
  showSuccessToast,
  onDismissToast,
  onCreateNew,
}) => {
  const [inspections, setInspections] = useState<InspectionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pass' | 'fail'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | '7' | '30'>('all');
  const [siteFilter, setSiteFilter] = useState<'all' | string>('all');

  const [selectedInspection, setSelectedInspection] = useState<InspectionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [deviationInspection, setDeviationInspection] = useState<InspectionDetail | null>(null);
  const [deviationLoading, setDeviationLoading] = useState(false);
  const [deviationError, setDeviationError] = useState<string | null>(null);
  const [isDeviationModalOpen, setIsDeviationModalOpen] = useState(false);
  const fetchInspectionDetail = async (inspectionId: string): Promise<InspectionDetail> => {
    const { data, error: detailError } = await supabase
      .from('en_inspection_report_inspections')
      .select(
        `
        id,
        inspection_date,
        site,
        overall_status,
        odometer,
        remarks,
        vehicle:en_inspection_report_vehicles (
          registration_number,
          make,
          model
        ),
        driver:en_inspection_report_drivers (
          full_name,
          email
        ),
        responses:en_inspection_report_responses (
          id,
          condition,
          notes,
          photo_url,
          storage_bucket,
          item:en_inspection_report_items (
            question,
            category,
            correct_answer
          )
        )
      `
      )
      .eq('id', inspectionId)
      .maybeSingle();

    if (detailError) {
      throw detailError;
    }

    if (!data) {
      throw new Error('Inspection not found.');
    }

    return data as unknown as InspectionDetail;
  };

  const fetchInspections = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error: inspectionsError } = await supabase
        .from('en_inspection_report_inspections')
        .select(
          `
          id,
          inspection_date,
          site,
          overall_status,
          driver:en_inspection_report_drivers (
            full_name,
            email
          ),
          vehicle:en_inspection_report_vehicles (
            registration_number,
            make,
            model
          ),
          responses:en_inspection_report_responses (
            condition,
            item:en_inspection_report_items (
              question,
              category,
              correct_answer
            )
          )
        `
        )
        .order('inspection_date', { ascending: false });

      if (inspectionsError) {
        throw inspectionsError;
      }

      const summaries = buildInspectionSummaries((data ?? []) as InspectionWithRelations[]);
      setInspections(summaries);
    } catch (fetchError: any) {
      console.error(fetchError);
      setError(fetchError.message ?? 'Unable to load inspections.');
      setInspections([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInspections();
  }, [user.id]);

  const handleViewInspection = async (inspectionId: string) => {
    setDetailLoading(true);
    setDetailError(null);

    try {
      const detail = await fetchInspectionDetail(inspectionId);
      setSelectedInspection(detail);
    } catch (viewError: any) {
      console.error(viewError);
      setDetailError(viewError.message ?? 'Unable to load inspection details.');
      setSelectedInspection(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleViewDeviations = async (inspectionId: string) => {
    setDeviationLoading(true);
    setDeviationError(null);
    setIsDeviationModalOpen(true);

    try {
      const detail = await fetchInspectionDetail(inspectionId);
      setDeviationInspection(detail);
    } catch (deviationErr: any) {
      console.error(deviationErr);
      setDeviationError(deviationErr.message ?? 'Unable to load deviations for this inspection.');
      setDeviationInspection(null);
    } finally {
      setDeviationLoading(false);
    }
  };

  const closeDeviationModal = () => {
    setIsDeviationModalOpen(false);
    setDeviationError(null);
  };

  const siteOptions = useMemo(() => {
    const uniqueSites = new Set<string>();
    inspections.forEach(inspection => {
      const siteName = inspection.site?.trim();
      if (siteName) {
        uniqueSites.add(siteName);
      }
    });
    return Array.from(uniqueSites).sort((a, b) => a.localeCompare(b));
  }, [inspections]);

  useEffect(() => {
    if (siteFilter !== 'all' && !siteOptions.includes(siteFilter)) {
      setSiteFilter('all');
    }
  }, [siteFilter, siteOptions]);

  const filteredInspections = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const now = new Date();

    return inspections.filter(inspection => {
      if (normalizedSearch) {
        const haystack = `${inspection.vehicleLabel} ${inspection.site ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      const normalizedStatus = (inspection.overallStatus ?? '').toLowerCase();
      const hasFailures = inspection.failedItems > 0 || normalizedStatus === 'fail';
      const isPass = normalizedStatus === 'pass' && !hasFailures;
      const isFail = hasFailures || normalizedStatus === 'fail';

      if (statusFilter === 'pass' && !isPass) {
        return false;
      }

      if (statusFilter === 'fail' && !isFail) {
        return false;
      }

      if (dateFilter !== 'all') {
        if (!inspection.inspectionDate) {
          return false;
        }
        const inspectionDateValue = new Date(inspection.inspectionDate);
        if (Number.isNaN(inspectionDateValue.getTime())) {
          return false;
        }
        const limitDays = Number(dateFilter);
        const diffMs = now.getTime() - inspectionDateValue.getTime();
        const msPerDay = 24 * 60 * 60 * 1000;
        if (diffMs > limitDays * msPerDay) {
          return false;
        }
      }

      if (siteFilter !== 'all') {
        const siteName = inspection.site?.trim();
        if (!siteName || siteName !== siteFilter) {
          return false;
        }
      }

      return true;
    });
  }, [inspections, searchTerm, statusFilter, dateFilter, siteFilter]);

  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setSiteFilter('all');
  };

  useEffect(() => {
    if (loading || error || detailLoading) return;
    if (!filteredInspections.length) {
      if (selectedInspection) {
        setSelectedInspection(null);
      }
      return;
    }
    if (selectedInspection && filteredInspections.some(inspection => inspection.id === selectedInspection.id)) {
      return;
    }
    handleViewInspection(filteredInspections[0].id);
  }, [filteredInspections, loading, error, detailLoading, selectedInspection]);

  const groupedResponses = useMemo(() => {
    if (!selectedInspection?.responses?.length) {
      return [] as Array<[string, NonNullable<InspectionDetail['responses']>]>;
    }

    const map = new Map<string, NonNullable<InspectionDetail['responses']>>();
    selectedInspection.responses.forEach(response => {
      const category = response.item?.category?.trim() || 'General';
      if (!map.has(category)) {
        map.set(category, []);
      }
      map.get(category)!.push(response);
    });

    return Array.from(map.entries());
  }, [selectedInspection]);

  const deviations = useMemo(() => {
    if (!selectedInspection?.responses?.length) return [];
    return selectedInspection.responses.filter(response => {
      const itemLike = asItemLike(response.item ?? undefined);
      return isFailureAnswer(itemLike, normaliseAnswer(response.condition));
    });
  }, [selectedInspection]);
  const handleDownloadPdf = async () => {
    if (!selectedInspection) return;

    type InspectionResponse = NonNullable<InspectionDetail['responses']>[number];
    interface AugmentedResponse {
      response: InspectionResponse;
      index: number;
      key: string;
      itemLike: InspectionItemLike;
      normalizedCondition: string | null;
      isFail: boolean;
    }

    const augmentedResponses: AugmentedResponse[] = (selectedInspection.responses ?? []).map(
      (response, index) => {
        const itemLike = asItemLike(response.item ?? undefined);
        const normalizedCondition = normaliseAnswer(response.condition);
        return {
          response,
          index,
          key: response.id || `${selectedInspection.id}-${index}`,
          itemLike,
          normalizedCondition,
          isFail: isFailureAnswer(itemLike, normalizedCondition),
        };
      }
    );

    const responseImages = new Map<string, string>();
    const logoPromise = fetchImageAsDataUrl('/enprotec-1.jpg');
    const imageFetches: Promise<void>[] = [];

    augmentedResponses.forEach(({ response, key }) => {
      if (!response.photo_url) return;
      imageFetches.push(
        fetchImageAsDataUrl(response.photo_url).then(dataUrl => {
          if (dataUrl) {
            responseImages.set(key, dataUrl);
          }
        })
      );
    });

    let logoDataUrl: string | null = null;
    await Promise.all([
      logoPromise.then(dataUrl => {
        logoDataUrl = dataUrl;
      }),
      ...imageFetches,
    ]);

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    let pageWidth = doc.internal.pageSize.getWidth();
    let pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 18;
    const marginBottom = 20;
    const lineHeight = 4.8;

    const colors = {
      primary: { r: 0, g: 84, b: 166 },
      accent: { r: 14, g: 165, b: 233 },
      text: { r: 45, g: 55, b: 72 },
      muted: { r: 100, g: 116, b: 139 },
      surface: { r: 236, g: 244, b: 252 },
      surfaceAlt: { r: 248, g: 250, b: 252 },
      border: { r: 203, g: 213, b: 225 },
      danger: { r: 220, g: 38, b: 38 },
      success: { r: 22, g: 163, b: 74 },
    };

    let y = 0;

    const initPage = (isFirstPage: boolean) => {
      const headerHeight = isFirstPage ? 38 : 26;
      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');

      let headerTextStartX = marginX;
      if (logoDataUrl) {
        const logoFormat = logoDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        const { width: logoNativeWidth, height: logoNativeHeight } = doc.getImageProperties(logoDataUrl);
        let logoWidth = 32;
        let logoHeight = (logoNativeHeight * logoWidth) / logoNativeWidth;
        if (logoHeight > headerHeight - 10) {
          logoHeight = headerHeight - 10;
          logoWidth = (logoNativeWidth * logoHeight) / logoNativeHeight;
        }
        const logoY = headerHeight / 2 - logoHeight / 2;
        doc.addImage(logoDataUrl, logoFormat, marginX, logoY, logoWidth, logoHeight);
        headerTextStartX = marginX + logoWidth + 8;
      }

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(isFirstPage ? 16 : 12);
      const titleY = isFirstPage ? 22 : 17;
      doc.text('Enprotec Inspection Report', headerTextStartX, titleY);

      if (isFirstPage) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.text('Professional insights powered by Enprotec workflows', headerTextStartX, titleY + 6);
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);

      return headerHeight + 14;
    };

    const startNewPage = (isFirstPage = false) => {
      if (!isFirstPage) {
        doc.addPage();
        pageWidth = doc.internal.pageSize.getWidth();
        pageHeight = doc.internal.pageSize.getHeight();
      }
      y = initPage(isFirstPage);
    };

    const ensureSpace = (required: number) => {
      if (y + required > pageHeight - marginBottom) {
        startNewPage();
      }
    };

    const drawSectionHeading = (title: string) => {
      ensureSpace(14);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.text(title, marginX, y);
      doc.setDrawColor(colors.accent.r, colors.accent.g, colors.accent.b);
      doc.setLineWidth(0.6);
      doc.line(marginX, y + 1.5, Math.min(marginX + 42, pageWidth - marginX), y + 1.5);
      doc.setLineWidth(0.2);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      y += 9;
    };

    const drawSubheading = (title: string) => {
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.text(title, marginX, y);
      doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
      doc.setLineWidth(0.3);
      doc.line(marginX, y + 1.2, pageWidth - marginX, y + 1.2);
      doc.setLineWidth(0.2);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      y += 6;
    };

    const renderResponseTable = (rows: AugmentedResponse[]) => {
      if (!rows.length) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(9.5);
        doc.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b);
        doc.text('No responses recorded for this category.', marginX, y);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
        y += 6;
        return;
      }

      const tableColumns = [
        { header: '#', width: 10 },
        { header: 'Question', width: 80 },
        { header: 'Result', width: 32 },
        { header: 'Notes', width: 52 },
      ];
      const tableWidth = tableColumns.reduce((sum, column) => sum + column.width, 0);
      const paddingX = 2.5;
      const paddingY = 3;
      const headerHeight = 8;

      ensureSpace(headerHeight + 2);
      doc.setFillColor(colors.primary.r, colors.primary.g, colors.primary.b);
      doc.setTextColor(255, 255, 255);
      doc.rect(marginX, y, tableWidth, headerHeight, 'F');

      let headerX = marginX + paddingX;
      tableColumns.forEach(column => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.text(column.header, headerX, y + headerHeight - 3);
        headerX += column.width;
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      y += headerHeight;

      rows.forEach((row, rowIndex) => {
        const question = row.response.item?.question?.trim() ?? `Checklist item ${rowIndex + 1}`;
        const resultLabel = (
          row.response.condition ?? row.normalizedCondition ?? 'N/A'
        )
          .toString()
          .toUpperCase();
        const notes = row.response.notes?.trim() ? row.response.notes : 'No notes';

        const columnLines = [
          [String(rowIndex + 1)],
          doc.splitTextToSize(question, tableColumns[1].width - paddingX * 2),
          (() => {
            const lines = doc.splitTextToSize(resultLabel, tableColumns[2].width - paddingX * 2);
            if (row.isFail) {
              lines.push('Deviation');
            } else if (row.normalizedCondition === 'pass') {
              lines.push('Compliant');
            }
            return lines;
          })(),
          doc.splitTextToSize(notes, tableColumns[3].width - paddingX * 2),
        ];

        const maxLineCount = columnLines.reduce((max, lines) => Math.max(max, lines.length), 1);
        const rowHeight = Math.max(maxLineCount * lineHeight + paddingY * 2, 11);

        ensureSpace(rowHeight + 1);
        const fillColor = rowIndex % 2 === 0 ? colors.surfaceAlt : { r: 255, g: 255, b: 255 };
        doc.setFillColor(fillColor.r, fillColor.g, fillColor.b);
        doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
        doc.rect(marginX, y, tableWidth, rowHeight, 'FD');

        let cellX = marginX;
        columnLines.forEach((lines, columnIndex) => {
          const column = tableColumns[columnIndex];
          let textColor = colors.text;
          if (column.header === 'Result') {
            if (row.isFail) {
              textColor = colors.danger;
            } else if (row.normalizedCondition === 'pass') {
              textColor = colors.success;
            }
          }
          doc.setTextColor(textColor.r, textColor.g, textColor.b);
          lines.forEach((line, lineIndex) => {
            const lineY = y + paddingY + (lineIndex + 1) * lineHeight;
            doc.text(line, cellX + paddingX, lineY);
          });
          cellX += column.width;
        });

        doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
        y += rowHeight;
      });

      y += 4;
    };

    startNewPage(true);

    const vehicleLabel = [
      selectedInspection.vehicle?.registration_number ?? 'Unknown registration',
      [selectedInspection.vehicle?.make, selectedInspection.vehicle?.model].filter(Boolean).join(' '),
    ]
      .filter(Boolean)
      .join(' - ');

    const overviewEntries = [
      { label: 'Inspection ID', value: selectedInspection.id },
      {
        label: 'Inspection Date',
        value: selectedInspection.inspection_date
          ? new Date(selectedInspection.inspection_date).toLocaleString()
          : 'Unknown',
      },
      { label: 'Vehicle', value: vehicleLabel || 'Not recorded' },
      {
        label: 'Driver',
        value: `${selectedInspection.driver?.full_name ?? 'N/A'} (${selectedInspection.driver?.email ?? 'N/A'})`,
      },
      { label: 'Site', value: selectedInspection.site ?? 'N/A' },
      {
        label: 'Odometer',
        value:
          selectedInspection.odometer != null
            ? `${selectedInspection.odometer.toLocaleString()} km`
            : 'N/A',
      },
      { label: 'Overall Status', value: selectedInspection.overall_status ?? 'Pending' },
    ];

    const cardPadding = 8;
    const cardTitleHeight = 6;
    const availableCardWidth = pageWidth - marginX * 2 - cardPadding * 2;
    const overviewContent = overviewEntries.map(entry => ({
      ...entry,
      valueLines: doc.splitTextToSize(entry.value, availableCardWidth),
    }));
    const cardHeight =
      cardPadding * 2 +
      cardTitleHeight +
      overviewContent.reduce(
        (acc, entry) => acc + 3.8 + entry.valueLines.length * lineHeight + 2.2,
        0
      );

    ensureSpace(cardHeight + 4);
    doc.setFillColor(colors.surface.r, colors.surface.g, colors.surface.b);
    doc.roundedRect(marginX, y, pageWidth - marginX * 2, cardHeight, 3, 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
    doc.text('Inspection Overview', marginX + cardPadding, y + cardPadding + 4);

    let overviewY = y + cardPadding + cardTitleHeight + 4;
    overviewContent.forEach(entry => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b);
      doc.text(entry.label.toUpperCase(), marginX + cardPadding, overviewY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      entry.valueLines.forEach((line, lineIndex) => {
        const lineY = overviewY + 4 + lineIndex * lineHeight;
        doc.text(line, marginX + cardPadding, lineY);
      });

      overviewY += 3.8 + entry.valueLines.length * lineHeight + 2.2;
    });

    y += cardHeight + 8;

    if (selectedInspection.remarks?.trim()) {
      drawSectionHeading('Inspector Remarks');
      const remarksLines = doc.splitTextToSize(
        selectedInspection.remarks.trim(),
        pageWidth - marginX * 2
      );
      const remarksHeight = remarksLines.length * lineHeight + 4;
      ensureSpace(remarksHeight);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      doc.text(remarksLines, marginX, y);
      y += remarksHeight + 4;
    }

    drawSectionHeading('Checklist Responses');

    if (!augmentedResponses.length) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b);
      doc.text('No checklist responses were captured for this inspection.', marginX, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      y += 6;
    } else {
      const groupedByCategory = augmentedResponses.reduce((acc, current) => {
        const category = current.response.item?.category?.trim() || 'General';
        if (!acc.has(category)) {
          acc.set(category, []);
        }
        acc.get(category)!.push(current);
        return acc;
      }, new Map<string, AugmentedResponse[]>());

      groupedByCategory.forEach((categoryResponses, category) => {
        drawSubheading(category);
        renderResponseTable(categoryResponses);
      });
    }

    drawSectionHeading('Deviation Summary');
    const deviationRows = augmentedResponses.filter(entry => entry.isFail);
    if (!deviationRows.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(colors.success.r, colors.success.g, colors.success.b);
      doc.text('No deviations were recorded for this inspection.', marginX, y);
      doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
      y += 6;
    } else {
      renderResponseTable(deviationRows);
    }

    const photoEntries = augmentedResponses.filter(entry => entry.response.photo_url);
    if (photoEntries.length) {
      drawSectionHeading('Photos & Evidence');
      photoEntries.forEach(entry => {
        const questionLabel =
          entry.response.item?.question?.trim() ?? `Checklist item ${entry.index + 1}`;
        const questionLines = doc.splitTextToSize(questionLabel, pageWidth - marginX * 2);
        const notesLines = entry.response.notes?.trim()
          ? doc.splitTextToSize(entry.response.notes, pageWidth - marginX * 2)
          : [];
        const resultLabel = (
          entry.response.condition ?? entry.normalizedCondition ?? 'N/A'
        )
          .toString()
          .toUpperCase();

        const imageDataUrl = responseImages.get(entry.key);
        let imageHeight = 0;
        const maxImageWidth = pageWidth - marginX * 2;
        let imageFormat: 'PNG' | 'JPEG' = 'JPEG';

        if (imageDataUrl) {
          imageFormat = imageDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          const { width: imgNativeWidth, height: imgNativeHeight } =
            doc.getImageProperties(imageDataUrl);
          const calculatedHeight = (imgNativeHeight * maxImageWidth) / imgNativeWidth || 60;
          imageHeight = Math.min(calculatedHeight, 90);
        }

        const blockHeight =
          questionLines.length * lineHeight +
          6 +
          (imageHeight ? imageHeight + 6 : 0) +
          (notesLines.length ? notesLines.length * lineHeight + 4 : 0);
        ensureSpace(blockHeight + 6);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10.5);
        doc.setTextColor(colors.primary.r, colors.primary.g, colors.primary.b);
        doc.text(questionLines, marginX, y);
        y += questionLines.length * lineHeight + 1.5;

        const resultColor = entry.isFail ? colors.danger : colors.success;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(resultColor.r, resultColor.g, resultColor.b);
        const deviationSuffix = entry.isFail
          ? ' (Deviation)'
          : entry.normalizedCondition === 'pass'
            ? ' (Compliant)'
            : '';
        doc.text(`Result: ${resultLabel}${deviationSuffix}`, marginX, y + 4);
        y += 8;
        doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);

        if (imageDataUrl) {
          doc.addImage(imageDataUrl, imageFormat, marginX, y, maxImageWidth, imageHeight);
          y += imageHeight + 4;
        } else if (entry.response.photo_url) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(colors.muted.r, colors.muted.g, colors.muted.b);
          const bucketInfo = entry.response.storage_bucket
            ? ` (${entry.response.storage_bucket})`
            : '';
          const fallbackLines = doc.splitTextToSize(
            `Photo URL${bucketInfo}: ${entry.response.photo_url}`,
            pageWidth - marginX * 2
          );
          doc.text(fallbackLines, marginX, y);
          y += fallbackLines.length * lineHeight + 2;
          doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
        }

        if (notesLines.length) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(colors.text.r, colors.text.g, colors.text.b);
          doc.text(notesLines, marginX, y);
          y += notesLines.length * lineHeight + 3;
        }

        doc.setDrawColor(colors.border.r, colors.border.g, colors.border.b);
        doc.setLineWidth(0.2);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 6;
      });
    }

    doc.save(`inspection-${selectedInspection.id}.pdf`);
  };
  const renderInspections = () => {
    if (loading) {
      return (
        <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-zinc-200 bg-white">
          <span className="text-sm text-zinc-500">Loading your inspections...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
          {error}
        </div>
      );
    }

    if (!inspections.length) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h3 className="text-lg font-semibold text-zinc-900">No inspections yet</h3>
          <p className="mt-2 text-sm text-zinc-500">Start your first inspection to see it listed here.</p>
          <button
            type="button"
            onClick={onCreateNew}
            className="mt-6 inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Create Inspection
          </button>
        </div>
      );
    }

    if (!filteredInspections.length) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-10 text-center">
          <h3 className="text-base font-semibold text-zinc-900">No inspections found</h3>
          <p className="mt-2 text-sm text-zinc-500">
            Adjust your search or filters to see inspections that match.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 inline-flex items-center justify-center rounded-md border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
          >
            Reset Filters
          </button>
        </div>
      );
    }

    return (
      <ul className="flex flex-col gap-4">
        {filteredInspections.map(inspection => (
          <li key={inspection.id} className="rounded-xl border border-zinc-200 bg-white px-4 py-5 shadow-sm sm:px-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-zinc-900">{inspection.vehicleLabel}</h3>
                <p className="text-sm text-zinc-500">
                  {inspection.formattedDate}
                  {inspection.site ? ` - ${inspection.site}` : ''}
                </p>
              </div>
              <div className="flex flex-col items-stretch justify-end gap-2 sm:items-end sm:text-right">
                <StatusPill
                  failedItems={inspection.failedItems}
                  totalItems={inspection.totalItems}
                  overallStatus={inspection.overallStatus}
                />
                <button
                  type="button"
                  onClick={() => handleViewInspection(inspection.id)}
                  className="inline-flex items-center justify-center rounded-md border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  View Details
                </button>
                {inspection.failedItems > 0 && (
                  <button
                    type="button"
                    onClick={() => handleViewDeviations(inspection.id)}
                    className="inline-flex items-center justify-center rounded-md border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                  >
                    View Deviations
                  </button>
                )}
              </div>
            </div>
            {inspection.failedItems > 0 && (
              <p className="mt-4 text-sm text-red-600">
                {inspection.failedItems} item{inspection.failedItems === 1 ? '' : 's'} require attention.
              </p>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const renderDetailPanel = () => {
    if (detailLoading) {
      return (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-zinc-200 bg-white">
          <span className="text-sm text-zinc-500">Loading inspection details...</span>
        </div>
      );
    }

    if (detailError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-8 text-sm text-red-700">
          {detailError}
        </div>
      );
    }

    if (!selectedInspection) {
      return (
        <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 text-center">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Select an inspection</h3>
            <p className="mt-2 text-sm text-zinc-500">Choose an inspection from the list to view details.</p>
          </div>
        </div>
      );
    }

    const infoBlocks = [
      {
        label: 'Inspection Date',
        value: selectedInspection.inspection_date
          ? new Date(selectedInspection.inspection_date).toLocaleString()
          : 'Unknown',
      },
      { label: 'Site', value: selectedInspection.site ?? 'Not recorded' },
      {
        label: 'Vehicle',
        value: [
          selectedInspection.vehicle?.registration_number ?? 'Unknown registration',
          [selectedInspection.vehicle?.make, selectedInspection.vehicle?.model].filter(Boolean).join(' '),
        ]
          .filter(Boolean)
          .join(' - '),
      },
      {
        label: 'Driver',
        value: `${selectedInspection.driver?.full_name ?? 'N/A'} (${selectedInspection.driver?.email ?? 'N/A'})`,
      },
      {
        label: 'Odometer',
        value:
          selectedInspection.odometer != null
            ? `${selectedInspection.odometer.toLocaleString()} km`
            : 'Not captured',
      },
      { label: 'Overall Status', value: selectedInspection.overall_status ?? 'Pending' },
    ];

    return (
      <div className="flex flex-col gap-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 border-b border-zinc-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Vehicle Inspection</p>
            <h2 className="mt-1 text-xl font-semibold text-zinc-900">
              {selectedInspection.vehicle?.registration_number ?? selectedInspection.id}
            </h2>
            <p className="text-sm text-zinc-500">{selectedInspection.site ?? 'Site not recorded'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <StatusPill
              failedItems={deviations.length}
              totalItems={selectedInspection.responses?.length ?? 0}
              overallStatus={selectedInspection.overall_status}
            />
            <button
              type="button"
              onClick={handleDownloadPdf}
              className="inline-flex items-center justify-center rounded-md bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Download PDF
            </button>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {infoBlocks.map(block => (
            <div key={block.label} className="rounded-lg border border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{block.label}</p>
              <p className="mt-1 text-sm text-zinc-900">{block.value}</p>
            </div>
          ))}
        </div>

        {selectedInspection.remarks?.trim() && (
          <div className="rounded-lg border border-sky-100 bg-sky-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-sky-700">Inspector Remarks</p>
            <p className="mt-2 text-sm text-zinc-700">{selectedInspection.remarks}</p>
          </div>
        )}

        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-900">Checklist Responses</h3>
            <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
              {selectedInspection.responses?.length ?? 0} item
              {(selectedInspection.responses?.length ?? 0) === 1 ? '' : 's'}
            </span>
          </div>

          {groupedResponses.length === 0 ? (
            <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-10 text-center text-sm text-zinc-500">
              No responses were captured for this inspection.
            </div>
          ) : (
            groupedResponses.map(([category, responses]) => (
              <div key={category} className="overflow-hidden rounded-lg border border-zinc-100">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/80 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">{category}</p>
                    <p className="text-sm text-zinc-500">
                      {responses.length} response{responses.length === 1 ? '' : 's'}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">
                    {
                      responses.filter(response =>
                        isFailureAnswer(asItemLike(response.item ?? undefined), normaliseAnswer(response.condition))
                      ).length
                    }{' '}
                    deviation{
                      responses.filter(response =>
                        isFailureAnswer(asItemLike(response.item ?? undefined), normaliseAnswer(response.condition))
                      ).length === 1
                        ? ''
                        : 's'
                    }
                  </span>
                </div>

                <ul className="divide-y divide-zinc-100">
                  {responses.map((response, index) => {
                    const itemLike = asItemLike(response.item ?? undefined);
                    const normalized = normaliseAnswer(response.condition);
                    const isFail = isFailureAnswer(itemLike, normalized);
                    const statusLabel = (response.condition ?? normalized ?? 'N/A').toUpperCase();

                    return (
                      <li key={response.id || `${selectedInspection.id}-${index}`} className="p-4">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-2">
                            <p className="text-sm font-semibold text-zinc-900">
                              {response.item?.question ?? `Checklist item ${index + 1}`}
                            </p>
                            <div className="flex flex-wrap gap-2 text-xs text-zinc-500">
                              <span className="rounded-full border border-zinc-200 px-2 py-0.5">
                                Response: {statusLabel}
                              </span>
                              {isFail && (
                                <span className="rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-red-600">
                                  Deviation
                                </span>
                              )}
                            </div>
                            {response.notes?.trim() && (
                              <p className="text-sm text-zinc-600">
                                <span className="font-medium text-zinc-500">Notes:</span> {response.notes}
                              </p>
                            )}
                            {response.photo_url && (
                              <p className="text-xs text-zinc-400">
                                Photo captured; stored in {response.storage_bucket ?? 'default bucket'}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderDeviationModal = () => {
    if (!isDeviationModalOpen) return null;

    const deviationResponses =
      deviationInspection?.responses?.filter(response =>
        isFailureAnswer(asItemLike(response.item ?? undefined), normaliseAnswer(response.condition))
      ) ?? [];

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-10">
        <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sky-600">Inspection Deviations</p>
              <h3 className="text-lg font-semibold text-zinc-900">
                {deviationInspection?.vehicle?.registration_number ?? 'Selected Inspection'}
              </h3>
              <p className="text-xs text-zinc-500">
                {deviationInspection?.inspection_date
                  ? new Date(deviationInspection.inspection_date).toLocaleString()
                  : ''}
              </p>
            </div>
            <button
              type="button"
              onClick={closeDeviationModal}
              className="inline-flex items-center justify-center rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              Close
            </button>
          </div>

          <div className="px-6 py-4">
            {deviationLoading ? (
              <div className="flex h-40 items-center justify-center">
                <span className="text-sm text-zinc-500">Loading deviations...</span>
              </div>
            ) : deviationError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {deviationError}
              </div>
            ) : deviationResponses.length === 0 ? (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/60 px-4 py-10 text-center text-sm text-zinc-500">
                No deviations recorded for this inspection.
              </div>
            ) : (
              <div className="overflow-hidden rounded-lg border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        #
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Item
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Result
                      </th>
                      <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 bg-white">
                    {deviationResponses.map((response, index) => (
                      <tr key={response.id || `${deviationInspection?.id ?? 'deviation'}-${index}`}>
                        <td className="px-4 py-3 text-sm text-zinc-500">{index + 1}</td>
                        <td className="px-4 py-3 text-sm text-zinc-900">
                          {response.item?.question ?? `Checklist item ${index + 1}`}
                          {response.item?.category && (
                            <span className="ml-2 text-xs text-zinc-400">({response.item.category})</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-red-600">
                          {(response.condition ?? normaliseAnswer(response.condition) ?? 'N/A').toUpperCase()}
                        </td>
                        <td className="px-4 py-3 text-sm text-zinc-600">
                          {response.notes?.trim() ? (
                            response.notes
                          ) : (
                            <span className="text-zinc-400">No notes provided</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      {showSuccessToast && (
        <div className="flex items-center justify-between rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <span>Inspection captured successfully.</span>
          <button
            type="button"
            onClick={onDismissToast}
            className="rounded border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-100"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <aside className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900">Your Inspections</h2>
            <button
              type="button"
              onClick={onCreateNew}
              className="inline-flex items-center justify-center rounded-md border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              New Inspection
            </button>
          </div>

          <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Search</label>
              <input
                type="search"
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search by vehicle or site..."
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Status
                <select
                  value={statusFilter}
                  onChange={event => setStatusFilter(event.target.value as 'all' | 'pass' | 'fail')}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">All statuses</option>
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Period
                <select
                  value={dateFilter}
                  onChange={event => setDateFilter(event.target.value as 'all' | '7' | '30')}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">All time</option>
                  <option value="7">Last 7 days</option>
                  <option value="30">Last 30 days</option>
                </select>
              </label>
              <label className="flex flex-col gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 md:col-span-1">
                Site
                <select
                  value={siteFilter}
                  onChange={event => setSiteFilter(event.target.value)}
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-normal text-zinc-900 shadow-sm transition focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
                >
                  <option value="all">All sites</option>
                  {siteOptions.map(site => (
                    <option key={site} value={site}>
                      {site}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {renderInspections()}
        </aside>

        <section>{renderDetailPanel()}</section>
      </div>

      {renderDeviationModal()}
    </div>
  );
};
const fetchImageAsDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () =>
        reject(reader.error ?? new Error('Failed to convert inspection image to data URL'));
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Unable to embed inspection photo in PDF', error);
    return null;
  }
};

function buildInspectionSummaries(rows: InspectionWithRelations[]): InspectionSummary[] {
  return rows.map(row => {
    const totalItems = row.responses?.length ?? 0;
    const failedItems =
      row.responses?.filter(response =>
        isFailureAnswer(asItemLike(response.item ?? undefined), normaliseAnswer(response.condition))
      ).length ?? 0;
    const inspectionDate = row.inspection_date ? new Date(row.inspection_date) : null;

    const formattedDate = inspectionDate
      ? inspectionDate.toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        })
      : 'Date not recorded';

    const registration = row.vehicle?.registration_number?.trim();
    const make = row.vehicle?.make?.trim();
    const model = row.vehicle?.model?.trim();
    const makeModel = [make, model].filter(Boolean).join(' ');

    const labelParts: string[] = [];
    if (registration) labelParts.push(registration);
    if (makeModel) labelParts.push(makeModel);

    const vehicleLabel = labelParts.length ? labelParts.join(' - ') : `Vehicle ${row.id.slice(0, 6)}`;

    return {
      id: row.id,
      inspectionDate: row.inspection_date,
      formattedDate,
      site: row.site,
      vehicleLabel,
      totalItems,
      failedItems,
      overallStatus: row.overall_status,
    };
  });
}

interface StatusPillProps {
  totalItems: number;
  failedItems: number;
  overallStatus: string | null;
}

const StatusPill: React.FC<StatusPillProps> = ({ failedItems, totalItems, overallStatus }) => {
  const normalized = (overallStatus ?? '').toLowerCase();
  let derivedStatus = normalized;

  if (!derivedStatus) {
    if (failedItems > 0) {
      derivedStatus = 'fail';
    } else if (totalItems > 0) {
      derivedStatus = 'pass';
    } else {
      derivedStatus = 'pending';
    }
  }

  const baseClasses =
    'inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold shadow-sm';

  switch (derivedStatus) {
    case 'pass':
      return (
        <span className={`${baseClasses} border border-emerald-200 bg-emerald-50 text-emerald-700`}>
          <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden="true" />
          Pass
        </span>
      );
    case 'fail':
      return (
        <span className={`${baseClasses} border border-red-200 bg-red-50 text-red-600`}>
          <span className="h-2 w-2 rounded-full bg-red-500" aria-hidden="true" />
          Attention Needed
        </span>
      );
    default:
      return (
        <span className={`${baseClasses} border border-zinc-200 bg-white text-zinc-600`}>
          <span className="h-2 w-2 rounded-full bg-zinc-400" aria-hidden="true" />
          Pending
        </span>
      );
  }
};

export default MyInspections;
