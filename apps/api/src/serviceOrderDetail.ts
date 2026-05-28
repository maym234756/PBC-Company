export interface ServiceOrderWorkspaceRow {
  id: string;
  inDate: string;
  roNumber: string;
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  roStatus: string;
  category: string;
  maker: string;
  note: string;
  tone: string;
  orderType: "Estimate" | "Repair Order";
}

export interface ServiceOrderTaskNoteEntry {
  id: string;
  kind: string;
  body: string;
  authorName: string;
  timeLabel: string;
}

export interface ServiceOrderTaskEntry {
  id: string;
  action: string;
  detail: string;
  status: string;
  tone: string;
  actorName: string;
  assignedName: string;
  lastUpdatedByName: string;
  timeLabel: string;
  ageLabel: string;
  slaLabel: string;
  breachLabel: string;
  isOverdue: boolean;
  latestCommentPreview: string | null;
  resolutionNote: string | null;
  notes: ServiceOrderTaskNoteEntry[];
}

export interface ServiceOrderActivityEntry {
  id: string;
  label: string;
  detail: string;
  tone: string;
  actorName: string;
  timeLabel: string;
}

export interface InitializeServiceOrderInput {
  id: string;
  inDate: string;
  roNumber: string;
  orderType: ServiceOrderWorkspaceRow["orderType"];
  customerName: string;
  stockNumber: string;
  model: string;
  serviceWriter: string;
  maker: string;
  note: string;
}

export interface ServiceOrderUnit {
  id: string;
  label: string;
  stockNumber: string;
  make: string;
  model: string;
  year: string;
  serialNumber: string;
  unitType: string;
  location: string;
  hoursIn: string;
  hoursOut: string;
  notes: string;
  onLot: boolean;
}

export interface ServiceOrderPart {
  partNumber: string;
  description: string;
  supplier: string;
  available: number;
  price: number;
  quantity: number;
  category: string;
}

export interface ServiceOrderLaborLine {
  technician: string;
  jobCode: string;
  description: string;
  quantity: string;
  laborRate: string;
  chargeBy: string;
  rate: number;
  total: number;
  closedDate: string;
  completedBy: string;
}

export interface ServiceOrderSubletLine {
  vendor: string;
  code: string;
  description: string;
  price: number;
  invoiceNumber: string;
  date: string;
}

export interface ServiceOrderWarrantyClaim {
  warrantyClaimNumber: string;
  internalWarrantyNumber: string;
  failureDate: string;
  contentionCode: string;
  problemCode: string;
  problemDescription: string;
  claimType: string;
  status: string;
  deductible: number;
  failedPartNumber: string;
  actionTaken: string;
  reasonForDelay: string;
  carrierNumber: string;
  invoiceDate: string;
  invoiceNumber: string;
  dateFiledWithCarrier: string;
  authorizations: string[];
  extraLabor: Array<{
    hours: string;
    reason: string;
  }>;
}

export interface ServiceOrderJob {
  id: string;
  title: string;
  unitLabel: string;
  customerApproval: string;
  status: string;
  warranty: string;
  appliance: string;
  description: string;
  resolution: string;
  recommendations: string;
  jobCode: string;
  technician: string;
  laborRate: string;
  chargeBy: string;
  rate: number;
  quantity: number;
  total: number;
  closedDate: string;
  completedBy: string;
  techNotes: string;
  parts: ServiceOrderPart[];
  laborLines: ServiceOrderLaborLine[];
  subletLines: ServiceOrderSubletLine[];
  attachments: string[];
  warrantyClaim: ServiceOrderWarrantyClaim;
}

export interface ServiceOrderFollowUp {
  subject: string;
  owner: string;
  date: string;
  time: string;
  duration: string;
  type: string;
  confirmed: string;
  showed: string;
  automated: string;
  notes: string;
}

export interface ServiceOrderLaborSession {
  jobId?: string;
  jobTitle?: string;
  technician: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  actualHours: string;
  creditedHours: string;
  override: string;
}

export interface ServiceOrderDeposit {
  invoiceNumber: string;
  date: string;
  cashier: string;
  description: string;
  amount: number;
  paymentDate: string;
  cancelDate: string;
}

export interface ServiceOrderAttachment {
  name: string;
  visibility: string;
  kind: string;
  createdBy: string;
  createdTime: string;
  status: string;
}

export interface ServiceOrderHistoryLine {
  date: string;
  event: string;
  user: string;
  detail: string;
  oldValue: string;
  newValue: string;
}

export interface ServiceOrderSignatureDoc {
  description: string;
  createdBy: string;
  createdTime: string;
  completedTime: string;
  status: string;
  customer: string;
  dealer1: string;
  dealer2: string;
  dealer3: string;
  dealer4: string;
}

export interface ServiceOrderDetailPayload {
  roNumber: string;
  customerInfoEdited?: boolean;
  customerAddress: string[];
  homePhone: string;
  workPhone: string;
  cellPhone: string;
  email: string;
  customerNo: string;
  setupDate: string;
  loyaltyPoints: string;
  promisedDate: string;
  closedDate: string;
  purchaseOrder: string;
  jobs: ServiceOrderJob[];
  units: ServiceOrderUnit[];
  notes: string;
  transferNotes: string;
  miscCharges: Array<{
    label: string;
    amount: number;
    auto: boolean;
  }>;
  totals: {
    parts: number;
    labor: number;
    sublet: number;
    misc: number;
    beforeTax: number;
    salesTax: number;
    total: number;
    totalDue: number;
    saleType: string;
  };
  openFollowUps: ServiceOrderFollowUp[];
  closedFollowUps: ServiceOrderFollowUp[];
  laborCloseout: ServiceOrderLaborLine[];
  laborSessions: ServiceOrderLaborSession[];
  deposits: ServiceOrderDeposit[];
  attachments: ServiceOrderAttachment[];
  history: ServiceOrderHistoryLine[];
  signatureDocs: ServiceOrderSignatureDoc[];
  orderTypeMemory?: {
    repairOrderStatus: string;
    repairOrderCategory: string;
    repairOrderTone: string;
  };
  invoiceStatus?: string;
}

export interface ServiceOrderPartCatalogEntry {
  partNumber: string;
  description: string;
  supplier: string;
  category: string;
  price: number;
}

export type ServiceOrderDetailMutation =
  | {
      mode: "createJob";
      title: string;
      unitLabel: string;
      description: string;
      technician: string;
      jobCode?: string;
      recommendations?: string;
      resolution?: string;
    }
  | {
      mode: "updateJob";
      jobId: string;
      title: string;
      unitLabel: string;
      customerApproval: string;
      status: string;
      appliance: string;
      warranty: string;
      description: string;
      resolution: string;
      recommendations: string;
      technician: string;
      laborRate: string;
      chargeBy: string;
      rate: number;
      quantity: number;
    }
  | {
      mode: "addPart";
      jobId: string;
      partNumber: string;
      description: string;
      supplier: string;
      available: number;
      price: number;
      quantity: number;
      category: string;
    }
  | {
      mode: "removePart";
      jobId: string;
      partNumber: string;
    }
  | {
      mode: "addLaborSession";
      jobId: string;
      technician: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      actualHours: string;
      creditedHours: string;
      override: string;
    }
  | {
      mode: "updateWarrantyClaim";
      jobId: string;
      warrantyClaimNumber: string;
      internalWarrantyNumber: string;
      failureDate: string;
      contentionCode: string;
      problemCode: string;
      problemDescription: string;
      claimType: string;
      status: string;
      deductible: number;
      failedPartNumber: string;
      actionTaken: string;
      reasonForDelay: string;
      carrierNumber: string;
      invoiceDate: string;
      invoiceNumber: string;
      dateFiledWithCarrier: string;
    }
  | {
      mode: "updateOrderType";
      orderType: "Estimate" | "Repair Order";
    }
  | {
      mode: "updateNotes";
      notes: string;
      transferNotes: string;
    }
  | {
      mode: "updateCustomer";
      customerName: string;
      addressLine1: string;
      location: string;
      homePhone: string;
      cellPhone: string;
      workPhone: string;
      email: string;
      customerNo: string;
    }
  | {
      mode: "updateQueueRow";
      inDate: string;
      roNumber: string;
      orderType: "Estimate" | "Repair Order";
      customerName: string;
      stockNumber: string;
      model: string;
      serviceWriter: string;
      roStatus: string;
      category: string;
      maker: string;
      note: string;
    }
  | {
      mode: "deleteJob";
      jobId: string;
    }
  | {
      mode: "closeLabor";
      jobId: string;
      lineIndex: number;
      actorName: string;
    }
  | {
      mode: "reopenLabor";
      jobId: string;
      lineIndex: number;
    }
  | {
      mode: "deleteLaborSession";
      sessionIndex: number;
    }
  | {
      mode: "editLaborSession";
      sessionIndex: number;
      technician: string;
      startDate: string;
      startTime: string;
      endDate: string;
      endTime: string;
      actualHours: string;
      creditedHours: string;
      override: string;
    }
  | {
      mode: "updateROHeader";
      purchaseOrder: string;
      promisedDate: string;
      closedDate: string;
    }
  | {
      mode: "finalizeInvoice";
      invoiceStatus: "Draft" | "Finalized" | "Paid" | "Voided";
    }
  | { mode: "updateJobStatus"; jobId: string; status: string }
  | { mode: "requestSignature"; docType: string; recipient: string; message: string }
  | { mode: "recordPayment"; method: string; amount: number; reference: string };

type ServiceOrderWorkspaceRowPatch = Partial<
  Pick<
    ServiceOrderWorkspaceRow,
    "inDate" | "roNumber" | "orderType" | "customerName" | "stockNumber" | "model" | "serviceWriter" | "roStatus" | "category" | "maker" | "note" | "tone"
  >
>;

export interface ServiceOrderDetailMutationResult {
  detail: ServiceOrderDetailPayload;
  message: string;
  activityLabel: string;
  activityDetail: string;
  activityTone: "stable" | "accent" | "attention" | "neutral";
  rowPatch: ServiceOrderWorkspaceRowPatch;
}

export function buildServiceOrderPartCatalog(
  entries: Array<{
    partNumber: string;
    description: string;
    supplier: string;
    category: string;
    orderCost: number;
  }>
) {
  const seen = new Set<string>();

  return entries
    .filter((entry) => {
      const key = `${entry.partNumber}:${entry.supplier}`;

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    })
    .map((entry) => ({
      partNumber: entry.partNumber,
      description: entry.description,
      supplier: entry.supplier,
      category: entry.category,
      price: roundWorkbenchCurrency(entry.orderCost / 100)
    }));
}

export function serializeServiceOrderDetail(detail: ServiceOrderDetailPayload) {
  return JSON.stringify(detail);
}

export function initializeServiceOrder(input: InitializeServiceOrderInput) {
  const normalizedModel = input.model.trim() || "Unspecified unit";
  const normalizedStockNumber = input.stockNumber.trim() || "TBD";
  const normalizedNote = input.note.trim() || buildInitialServiceOrderNote(input.orderType);
  const normalizedMaker = input.maker.trim() || deriveServiceOrderMaker(normalizedModel);
  const normalizedServiceWriter = input.serviceWriter.trim() || "Service Desk";
  const row: ServiceOrderWorkspaceRow = {
    id: input.id,
    inDate: input.inDate,
    roNumber: input.roNumber,
    customerName: input.customerName.trim(),
    stockNumber: normalizedStockNumber,
    model: normalizedModel,
    serviceWriter: normalizedServiceWriter,
    roStatus: input.orderType === "Estimate" ? "Estimate" : "Not Started",
    category: input.orderType === "Estimate" ? "Estimate" : "Fresh Intake",
    maker: normalizedMaker,
    note: normalizedNote,
    tone: input.orderType === "Estimate" ? "teal" : "salmon",
    orderType: input.orderType
  };
  const detail = resolveServiceOrderDetail(null, row, [], []);

  return {
    row,
    detail,
    detailSnapshot: serializeServiceOrderDetail(detail)
  };
}

export function resolveServiceOrderDetail(
  snapshot: string | null | undefined,
  row: ServiceOrderWorkspaceRow,
  taskEntries: ServiceOrderTaskEntry[],
  activityEntries: ServiceOrderActivityEntry[]
) {
  const parsedSnapshot = parseServiceOrderDetailSnapshot(snapshot);
  const baseDetail = parsedSnapshot ?? buildDefaultServiceOrderDetail(row, taskEntries, activityEntries);

  return hydrateServiceOrderDetail(baseDetail, row, taskEntries, activityEntries);
}

export function applyServiceOrderDetailMutation(
  row: ServiceOrderWorkspaceRow,
  currentDetail: ServiceOrderDetailPayload,
  mutation: ServiceOrderDetailMutation,
  taskEntries: ServiceOrderTaskEntry[],
  activityEntries: ServiceOrderActivityEntry[]
): ServiceOrderDetailMutationResult {
  const nextDetail = deepClone(currentDetail);
  const rowPatch: ServiceOrderWorkspaceRowPatch = {};
  let activityLabel = "Service detail updated";
  let activityDetail = `RO ${row.roNumber} detail updated.`;
  let message = "Service detail saved.";
  let activityTone: ServiceOrderDetailMutationResult["activityTone"] = "stable";

  switch (mutation.mode) {
    case "createJob": {
      const nextJobIndex = nextDetail.jobs.length + 1;
      const jobId = `${row.id}-job-${nextJobIndex}`;

      nextDetail.jobs.push({
        id: jobId,
        title: mutation.title.trim(),
        unitLabel: mutation.unitLabel.trim(),
        customerApproval: "",
        status: "",
        warranty: "",
        appliance: "",
        description: mutation.description.trim(),
        resolution: (mutation.resolution ?? "").trim(),
        recommendations: (mutation.recommendations ?? "").trim(),
        jobCode: (mutation.jobCode ?? "").trim(),
        technician: mutation.technician.trim(),
        laborRate: "",
        chargeBy: "",
        rate: 0,
        quantity: 0,
        total: 0,
        closedDate: "",
        completedBy: "",
        techNotes: "",
        parts: [],
        laborLines: [],
        subletLines: [],
        attachments: [],
        warrantyClaim: buildBlankServiceWorkbenchWarrantyClaim()
      });
      activityLabel = "Service job created";
      activityDetail = `RO ${row.roNumber} added blank job ${nextJobIndex}.`;
      message = "Job created.";
      activityTone = "accent";
      break;
    }
    case "deleteJob": {
      const jobIndex = nextDetail.jobs.findIndex((job) => job.id === mutation.jobId);

      if (jobIndex === -1) {
        throw new Error("Service job not found.");
      }
      if (nextDetail.jobs.length <= 1) {
        throw new Error("Cannot delete the only remaining job on this repair order.");
      }

      const deletedJob = nextDetail.jobs[jobIndex];
      nextDetail.jobs.splice(jobIndex, 1);
      activityLabel = "Service job deleted";
      activityDetail = `RO ${row.roNumber} removed job: ${deletedJob.title || `Job ${jobIndex + 1}`}.`;
      message = "Job deleted.";
      activityTone = "attention";
      break;
    }
    case "updateJob": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      targetJob.title = mutation.title.trim();
      targetJob.unitLabel = mutation.unitLabel.trim();
      targetJob.customerApproval = mutation.customerApproval.trim();
      targetJob.status = mutation.status.trim();
      targetJob.appliance = mutation.appliance.trim();
      targetJob.warranty = mutation.warranty.trim();
      targetJob.description = mutation.description.trim();
      targetJob.resolution = mutation.resolution.trim();
      targetJob.recommendations = mutation.recommendations.trim();
      targetJob.technician = mutation.technician.trim();
      targetJob.laborRate = mutation.laborRate.trim();
      targetJob.chargeBy = mutation.chargeBy.trim();
      targetJob.rate = roundWorkbenchCurrency(mutation.rate);
      targetJob.quantity = roundWorkbenchCurrency(mutation.quantity);

      if (isBlankServiceOrderJob(targetJob)) {
        targetJob.laborLines = [];
      } else {
        const existingLine = targetJob.laborLines[0] ?? {
          technician: targetJob.technician,
          jobCode: targetJob.jobCode,
          description: targetJob.title,
          quantity: formatWorkbenchHours(targetJob.quantity),
          laborRate: targetJob.laborRate,
          chargeBy: targetJob.chargeBy,
          rate: targetJob.rate,
          total: roundWorkbenchCurrency(targetJob.rate * targetJob.quantity),
          closedDate: targetJob.closedDate,
          completedBy: targetJob.completedBy
        };
        targetJob.laborLines[0] = {
          ...existingLine,
          technician: targetJob.technician,
          description: targetJob.title,
          quantity: formatWorkbenchHours(targetJob.quantity),
          laborRate: targetJob.laborRate,
          chargeBy: targetJob.chargeBy,
          rate: targetJob.rate,
          total: roundWorkbenchCurrency(targetJob.rate * targetJob.quantity)
        };
      }

      if (nextDetail.jobs[0]?.id === mutation.jobId) {
        rowPatch.note = targetJob.description;
        rowPatch.roStatus = targetJob.status;
      }

      activityLabel = "Service job updated";
      activityDetail = `RO ${row.roNumber} updated ${targetJob.title}.`;
      message = "Job saved.";
      break;
    }
    case "addPart": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      const existingPart = targetJob.parts.find((part) => part.partNumber === mutation.partNumber.trim());

      if (existingPart) {
        existingPart.quantity += mutation.quantity;
        existingPart.available = mutation.available;
        existingPart.price = roundWorkbenchCurrency(mutation.price);
        existingPart.description = mutation.description.trim();
      } else {
        targetJob.parts.push({
          partNumber: mutation.partNumber.trim(),
          description: mutation.description.trim(),
          supplier: mutation.supplier.trim(),
          available: mutation.available,
          price: roundWorkbenchCurrency(mutation.price),
          quantity: mutation.quantity,
          category: mutation.category.trim()
        });
      }

      if (targetJob.parts.some((part) => part.available === 0)) {
        rowPatch.category = "Parts Hold";
      }

      activityLabel = "Service part added";
      activityDetail = `RO ${row.roNumber} added part ${mutation.partNumber.trim()} to ${targetJob.title}.`;
      message = "Part saved to the job.";
      activityTone = mutation.available === 0 ? "attention" : "stable";
      break;
    }
    case "removePart": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      targetJob.parts = targetJob.parts.filter((part) => part.partNumber !== mutation.partNumber.trim());
      activityLabel = "Service part removed";
      activityDetail = `RO ${row.roNumber} removed part ${mutation.partNumber.trim()} from ${targetJob.title}.`;
      message = "Part removed from the job.";
      activityTone = "neutral";
      break;
    }
    case "addLaborSession": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      const actualHours = Number.parseFloat(mutation.actualHours);
      const safeActualHours = Number.isFinite(actualHours) && actualHours > 0 ? actualHours : 0.5;
      targetJob.laborLines.push({
        technician: mutation.technician.trim(),
        jobCode: targetJob.jobCode,
        description: `${targetJob.title} session`,
        quantity: formatWorkbenchHours(safeActualHours),
        laborRate: targetJob.laborRate,
        chargeBy: targetJob.chargeBy,
        rate: targetJob.rate,
        total: roundWorkbenchCurrency(targetJob.rate * safeActualHours),
        closedDate: mutation.endDate.trim(),
        completedBy: mutation.technician.trim()
      });
      nextDetail.laborSessions.unshift({
        jobId: targetJob.id,
        jobTitle: targetJob.title,
        technician: mutation.technician.trim(),
        startDate: mutation.startDate.trim(),
        startTime: mutation.startTime.trim(),
        endDate: mutation.endDate.trim(),
        endTime: mutation.endTime.trim(),
        actualHours: mutation.actualHours.trim(),
        creditedHours: mutation.creditedHours.trim(),
        override: mutation.override.trim()
      });
      activityLabel = "Labor session added";
      activityDetail = `RO ${row.roNumber} posted ${mutation.actualHours.trim()} hr to ${targetJob.title}.`;
      message = "Labor session added.";
      activityTone = "accent";
      break;
    }
    case "updateWarrantyClaim": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      targetJob.warrantyClaim = {
        ...targetJob.warrantyClaim,
        warrantyClaimNumber: mutation.warrantyClaimNumber.trim(),
        internalWarrantyNumber: mutation.internalWarrantyNumber.trim(),
        failureDate: mutation.failureDate.trim(),
        contentionCode: mutation.contentionCode.trim(),
        problemCode: mutation.problemCode.trim(),
        problemDescription: mutation.problemDescription.trim(),
        claimType: mutation.claimType.trim(),
        status: mutation.status.trim(),
        deductible: roundWorkbenchCurrency(mutation.deductible),
        failedPartNumber: mutation.failedPartNumber.trim(),
        actionTaken: mutation.actionTaken.trim(),
        reasonForDelay: mutation.reasonForDelay.trim(),
        carrierNumber: mutation.carrierNumber.trim(),
        invoiceDate: mutation.invoiceDate.trim(),
        invoiceNumber: mutation.invoiceNumber.trim(),
        dateFiledWithCarrier: mutation.dateFiledWithCarrier.trim()
      };
      rowPatch.category = targetJob.warrantyClaim.status.includes("Warranty") ? "Warranty" : row.category;
      activityLabel = "Warranty claim updated";
      activityDetail = `RO ${row.roNumber} updated warranty claim on ${targetJob.title}.`;
      message = "Warranty claim saved.";
      activityTone = targetJob.warrantyClaim.status.includes("Not Approved") ? "attention" : "stable";
      break;
    }
    case "updateOrderType": {
      applyServiceOrderTypeChange(nextDetail, row, rowPatch, mutation.orderType);

      activityLabel = mutation.orderType === "Estimate" ? "Estimate staged" : "Repair order promoted";
      activityDetail = `RO ${row.roNumber} is now tracked as ${mutation.orderType}.`;
      message = `Saved as ${mutation.orderType}.`;
      activityTone = "accent";
      break;
    }
    case "updateNotes": {
      nextDetail.notes = mutation.notes.trim();
      nextDetail.transferNotes = mutation.transferNotes.trim();

      activityLabel = "Service notes updated";
      activityDetail = `RO ${row.roNumber} operator and transfer notes updated.`;
      message = "Notes saved.";
      activityTone = "stable";
      break;
    }
    case "updateCustomer": {
      const customerName = mutation.customerName.trim();
      const addressLine1 = mutation.addressLine1.trim();
      const location = mutation.location.trim();

      rowPatch.customerName = customerName;
      nextDetail.customerInfoEdited = true;
      nextDetail.customerAddress = [addressLine1, location].filter((line) => line.length > 0);
      nextDetail.homePhone = mutation.homePhone.trim();
      nextDetail.cellPhone = mutation.cellPhone.trim();
      nextDetail.workPhone = mutation.workPhone.trim();
      nextDetail.email = mutation.email.trim();
      nextDetail.customerNo = mutation.customerNo.trim();

      activityLabel = customerName.length > 0 ? "Service customer updated" : "Service customer cleared";
      activityDetail =
        customerName.length > 0
          ? `RO ${row.roNumber} customer updated to ${customerName}.`
          : `RO ${row.roNumber} customer information cleared.`;
      message = customerName.length > 0 ? "Customer information saved." : "Customer information cleared.";
      activityTone = customerName.length > 0 ? "stable" : "attention";
      break;
    }
    case "updateQueueRow": {
      const previousDefaultNotes = buildDefaultServiceDetailNotes(row);
      const previousDefaultTransferNotes = buildDefaultServiceTransferNotes(row);
      const nextRow: ServiceOrderWorkspaceRow = {
        ...row,
        inDate: mutation.inDate.trim(),
        roNumber: mutation.roNumber.trim(),
        orderType: mutation.orderType,
        customerName: mutation.customerName.trim(),
        stockNumber: mutation.stockNumber.trim(),
        model: mutation.model.trim(),
        serviceWriter: mutation.serviceWriter.trim(),
        roStatus: mutation.roStatus.trim(),
        category: mutation.category.trim(),
        maker: mutation.maker.trim(),
        note: mutation.note.trim(),
        tone: row.tone
      };

      if (nextRow.orderType !== row.orderType) {
        applyServiceOrderTypeChange(nextDetail, row, rowPatch, nextRow.orderType);
        nextRow.orderType = rowPatch.orderType ?? nextRow.orderType;
        nextRow.roStatus = rowPatch.roStatus ?? nextRow.roStatus;
        nextRow.category = rowPatch.category ?? nextRow.category;
        nextRow.tone = rowPatch.tone ?? nextRow.tone;
      }

      nextRow.tone = resolveServiceQueueTone(nextRow, row.tone);

      rowPatch.inDate = nextRow.inDate;
      rowPatch.roNumber = nextRow.roNumber;
      rowPatch.orderType = nextRow.orderType;
      rowPatch.customerName = nextRow.customerName;
      rowPatch.stockNumber = nextRow.stockNumber;
      rowPatch.model = nextRow.model;
      rowPatch.serviceWriter = nextRow.serviceWriter;
      rowPatch.roStatus = nextRow.roStatus;
      rowPatch.category = nextRow.category;
      rowPatch.maker = nextRow.maker;
      rowPatch.note = nextRow.note;
      rowPatch.tone = nextRow.tone;

      if (nextDetail.notes === previousDefaultNotes) {
        nextDetail.notes = buildDefaultServiceDetailNotes(nextRow);
      }

      if (nextDetail.transferNotes === previousDefaultTransferNotes) {
        nextDetail.transferNotes = buildDefaultServiceTransferNotes(nextRow);
      }

      if (nextDetail.purchaseOrder === `PO-${row.roNumber}`) {
        nextDetail.purchaseOrder = `PO-${nextRow.roNumber}`;
      }

      const changedFields = describeChangedServiceQueueFields(row, nextRow);

      activityLabel = "Service queue row updated";
      activityDetail =
        row.roNumber !== nextRow.roNumber
          ? `RO ${row.roNumber} renumbered to ${nextRow.roNumber}${changedFields.length > 1 ? ` and updated ${changedFields.slice(1).join(", ")}.` : "."}`
          : `RO ${nextRow.roNumber} updated ${changedFields.join(", ")}.`;
      message = "Queue row saved.";
      activityTone = nextRow.orderType !== row.orderType || nextRow.roStatus !== row.roStatus || nextRow.category !== row.category ? "accent" : "stable";
      break;
    }
    case "closeLabor": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      const laborLine = targetJob.laborLines[mutation.lineIndex];

      if (!laborLine) {
        throw new Error("Labor line not found.");
      }

      const today = new Date().toLocaleDateString("en-US");
      laborLine.closedDate = today;
      laborLine.completedBy = mutation.actorName.trim();
      activityLabel = "Labor line closed";
      activityDetail = `RO ${row.roNumber} closed ${laborLine.description || laborLine.jobCode}.`;
      message = "Labor line closed.";
      activityTone = "stable";
      break;
    }
    case "reopenLabor": {
      const targetJob = nextDetail.jobs.find((job) => job.id === mutation.jobId);

      if (!targetJob) {
        throw new Error("Service job not found.");
      }

      const laborLine = targetJob.laborLines[mutation.lineIndex];

      if (!laborLine) {
        throw new Error("Labor line not found.");
      }

      laborLine.closedDate = "";
      laborLine.completedBy = "";
      activityLabel = "Labor line reopened";
      activityDetail = `RO ${row.roNumber} reopened ${laborLine.description || laborLine.jobCode}.`;
      message = "Labor line reopened.";
      activityTone = "accent";
      break;
    }
    case "deleteLaborSession": {
      if (mutation.sessionIndex < 0 || mutation.sessionIndex >= nextDetail.laborSessions.length) {
        throw new Error("Labor session not found.");
      }

      const removed = nextDetail.laborSessions.splice(mutation.sessionIndex, 1)[0];
      activityLabel = "Labor session deleted";
      activityDetail = `RO ${row.roNumber} removed session for ${removed.technician}.`;
      message = "Labor session deleted.";
      activityTone = "neutral";
      break;
    }
    case "editLaborSession": {
      const session = nextDetail.laborSessions[mutation.sessionIndex];

      if (!session) {
        throw new Error("Labor session not found.");
      }

      session.technician = mutation.technician.trim();
      session.startDate = mutation.startDate.trim();
      session.startTime = mutation.startTime.trim();
      session.endDate = mutation.endDate.trim();
      session.endTime = mutation.endTime.trim();
      session.actualHours = mutation.actualHours.trim();
      session.creditedHours = mutation.creditedHours.trim();
      session.override = mutation.override.trim();
      activityLabel = "Labor session updated";
      activityDetail = `RO ${row.roNumber} updated session for ${session.technician}.`;
      message = "Labor session updated.";
      break;
    }
    case "updateROHeader": {
      nextDetail.purchaseOrder = mutation.purchaseOrder.trim();
      nextDetail.promisedDate = mutation.promisedDate.trim();
      nextDetail.closedDate = mutation.closedDate.trim();
      activityLabel = "RO header updated";
      activityDetail = `RO ${row.roNumber} header fields updated (PO: ${mutation.purchaseOrder}, Promised: ${mutation.promisedDate}).`;
      message = "RO header saved.";
      break;
    }
    case "finalizeInvoice": {
      nextDetail.invoiceStatus = mutation.invoiceStatus;
      activityLabel = "Invoice status updated";
      activityDetail = `RO ${row.roNumber} invoice status set to ${mutation.invoiceStatus}.`;
      message = "Invoice updated.";
      break;
    }
    case "updateJobStatus": {
      const targetJob = nextDetail.jobs.find((j) => j.id === mutation.jobId);
      if (targetJob) {
        targetJob.status = mutation.status;
      }
      activityLabel = "Job status updated";
      activityDetail = `RO ${row.roNumber} job status set to ${mutation.status}.`;
      message = "Job status updated.";
      break;
    }
    case "requestSignature": {
      const newDoc = {
        description: mutation.docType,
        createdBy: "Current User",
        createdTime: new Date().toISOString().split("T")[0],
        completedTime: "",
        status: "Sent",
        customer: mutation.recipient,
        dealer1: "",
        dealer2: "",
        dealer3: "",
        dealer4: ""
      };
      nextDetail.signatureDocs = [...(nextDetail.signatureDocs ?? []), newDoc];
      activityLabel = "Signature requested";
      activityDetail = `RO ${row.roNumber} signature requested for ${mutation.docType}.`;
      message = "Signature request sent.";
      break;
    }
    case "recordPayment": {
      nextDetail.invoiceStatus = "Paid";
      activityLabel = "Payment recorded";
      activityDetail = `RO ${row.roNumber} payment of $${mutation.amount.toFixed(2)} via ${mutation.method}${mutation.reference ? ` (ref: ${mutation.reference})` : ""}.`;
      message = "Payment processed.";
      break;
    }
  }

  return {
    detail: hydrateServiceOrderDetail(nextDetail, { ...row, ...rowPatch }, taskEntries, activityEntries),
    message,
    activityLabel,
    activityDetail,
    activityTone,
    rowPatch
  };
}

function applyServiceOrderTypeChange(
  detail: ServiceOrderDetailPayload,
  row: ServiceOrderWorkspaceRow,
  rowPatch: ServiceOrderWorkspaceRowPatch,
  orderType: ServiceOrderWorkspaceRow["orderType"]
) {
  const orderTypeMemory = detail.orderTypeMemory ?? {
    repairOrderStatus: row.roStatus === "Estimate" ? "Not Started" : row.roStatus,
    repairOrderCategory: row.category === "Estimate" ? "Fresh Intake" : row.category,
    repairOrderTone: row.tone === "teal" ? "salmon" : row.tone
  };

  rowPatch.orderType = orderType;

  if (orderType === "Estimate") {
    detail.orderTypeMemory = {
      repairOrderStatus: row.orderType === "Estimate" ? orderTypeMemory.repairOrderStatus : row.roStatus,
      repairOrderCategory: row.orderType === "Estimate" ? orderTypeMemory.repairOrderCategory : row.category,
      repairOrderTone: row.orderType === "Estimate" ? orderTypeMemory.repairOrderTone : row.tone
    };
    rowPatch.roStatus = "Estimate";
    rowPatch.category = "Estimate";
    rowPatch.tone = "teal";
    return;
  }

  rowPatch.roStatus = orderTypeMemory.repairOrderStatus;
  rowPatch.category = orderTypeMemory.repairOrderCategory;
  rowPatch.tone = orderTypeMemory.repairOrderTone;
}

function parseServiceOrderDetailSnapshot(snapshot: string | null | undefined) {
  if (!snapshot) {
    return null;
  }

  try {
    return JSON.parse(snapshot) as ServiceOrderDetailPayload;
  } catch {
    return null;
  }
}

function hydrateServiceOrderDetail(
  detail: ServiceOrderDetailPayload,
  row: ServiceOrderWorkspaceRow,
  taskEntries: ServiceOrderTaskEntry[],
  activityEntries: ServiceOrderActivityEntry[]
) {
  const seed = resolveServiceSeed(row.roNumber);
  const isEstimate = row.orderType === "Estimate";
  const units = detail.units.length > 0 ? detail.units : buildServiceWorkbenchUnits(row, seed);
  const jobs = detail.jobs.map((job, jobIndex) => hydrateServiceOrderJob(job, row, jobIndex + 1));
  const miscCharges = detail.miscCharges.length > 0 ? detail.miscCharges : buildServiceWorkbenchMiscCharges(row, seed);
  const totals = buildServiceOrderTotals(jobs, miscCharges, isEstimate);
  const customerInfoEdited = detail.customerInfoEdited === true;

  return {
    ...detail,
    roNumber: row.roNumber,
    customerInfoEdited,
    customerAddress: customerInfoEdited || detail.customerAddress.length > 0 ? detail.customerAddress : buildServiceCustomerAddress(seed),
    homePhone: customerInfoEdited ? detail.homePhone : detail.homePhone || buildServicePhone(seed),
    workPhone: customerInfoEdited ? detail.workPhone : detail.workPhone || buildServicePhone(seed + 11),
    cellPhone: customerInfoEdited ? detail.cellPhone : detail.cellPhone || buildServicePhone(seed + 21),
    email: customerInfoEdited ? detail.email : detail.email || buildServiceEmail(row.customerName),
    customerNo: customerInfoEdited ? detail.customerNo : detail.customerNo || `${seed}${(seed % 97).toString().padStart(2, "0")}`,
    setupDate: detail.setupDate || shiftUsDate(row.inDate, -21),
    loyaltyPoints: detail.loyaltyPoints || `${(seed % 7) * 50}`,
    promisedDate: detail.promisedDate || shiftUsDate(row.inDate, isEstimate ? 7 : row.roStatus === "Ready to Cash" ? 1 : row.roStatus === "In Progress" ? 2 : 4),
    closedDate: isEstimate ? "" : detail.closedDate || (row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 4) : ""),
    purchaseOrder: detail.purchaseOrder || `PO-${row.roNumber}`,
    jobs,
    units,
    notes: detail.notes || buildDefaultServiceDetailNotes(row),
    transferNotes: detail.transferNotes || buildDefaultServiceTransferNotes(row),
    miscCharges,
    totals,
    openFollowUps: detail.openFollowUps.length > 0 ? detail.openFollowUps : buildDefaultOpenFollowUps(row, detail.promisedDate || shiftUsDate(row.inDate, 4)),
    closedFollowUps: detail.closedFollowUps.length > 0 ? detail.closedFollowUps : buildDefaultClosedFollowUps(row, activityEntries),
    laborCloseout: jobs.flatMap((job) => job.laborLines),
    laborSessions: detail.laborSessions,
    deposits: isEstimate ? [] : detail.deposits,
    attachments: detail.attachments.length > 0 ? detail.attachments : buildServiceWorkbenchAttachments(row, taskEntries),
    history: buildServiceWorkbenchHistory(row, taskEntries, activityEntries),
    signatureDocs: isEstimate ? [] : detail.signatureDocs
  };
}

function hydrateServiceOrderJob(job: ServiceOrderJob, row: ServiceOrderWorkspaceRow, jobIndex: number): ServiceOrderJob {
  const laborLines =
    job.laborLines.length > 0 || isBlankServiceOrderJob(job)
      ? job.laborLines
      : [
          {
            technician: job.technician,
            jobCode: job.jobCode,
            description: job.title,
            quantity: formatWorkbenchHours(job.quantity),
            laborRate: job.laborRate,
            chargeBy: job.chargeBy,
            rate: job.rate,
            total: roundWorkbenchCurrency(job.rate * job.quantity),
            closedDate: job.closedDate,
            completedBy: job.completedBy
          }
        ];
  const partsTotal = roundWorkbenchCurrency(job.parts.reduce((total, part) => total + part.price * part.quantity, 0));
  const laborTotal = roundWorkbenchCurrency(laborLines.reduce((total, line) => total + line.total, 0));
  const subletTotal = roundWorkbenchCurrency(job.subletLines.reduce((total, line) => total + line.price, 0));

  return {
    ...job,
    laborLines,
    total: roundWorkbenchCurrency(partsTotal + laborTotal + subletTotal),
    warrantyClaim: job.warrantyClaim ?? buildServiceWorkbenchWarrantyClaim(row, resolveServiceSeed(row.roNumber) + jobIndex, "", row.category.toLowerCase().includes("warranty"))
  };
}

function isBlankServiceOrderJob(job: ServiceOrderJob) {
  return (
    job.title.trim().length === 0 &&
    job.unitLabel.trim().length === 0 &&
    job.customerApproval.trim().length === 0 &&
    job.status.trim().length === 0 &&
    job.warranty.trim().length === 0 &&
    job.appliance.trim().length === 0 &&
    job.description.trim().length === 0 &&
    job.resolution.trim().length === 0 &&
    job.recommendations.trim().length === 0 &&
    job.jobCode.trim().length === 0 &&
    job.technician.trim().length === 0 &&
    job.laborRate.trim().length === 0 &&
    job.chargeBy.trim().length === 0 &&
    job.rate === 0 &&
    job.quantity === 0 &&
    job.parts.length === 0 &&
    job.laborLines.length === 0 &&
    job.subletLines.length === 0
  );
}

function buildServiceOrderTotals(
  jobs: ServiceOrderJob[],
  miscCharges: Array<{ label: string; amount: number; auto: boolean }>,
  isEstimate: boolean
) {
  const parts = roundWorkbenchCurrency(jobs.flatMap((job) => job.parts).reduce((total, part) => total + part.price * part.quantity, 0));
  const labor = roundWorkbenchCurrency(jobs.flatMap((job) => job.laborLines).reduce((total, line) => total + line.total, 0));
  const sublet = roundWorkbenchCurrency(jobs.flatMap((job) => job.subletLines).reduce((total, line) => total + line.price, 0));
  const misc = roundWorkbenchCurrency(miscCharges.reduce((total, charge) => total + charge.amount, 0));
  const beforeTax = roundWorkbenchCurrency(parts + labor + sublet + misc);
  const salesTax = isEstimate ? 0 : roundWorkbenchCurrency(parts * 0.0825);
  const total = roundWorkbenchCurrency(beforeTax + salesTax);

  return {
    parts,
    labor,
    sublet,
    misc,
    beforeTax,
    salesTax,
    total,
    totalDue: isEstimate ? 0 : roundWorkbenchCurrency(total * 0.35),
    saleType: isEstimate ? "ESTIMATE ONLY" : "CUSTOMER - TAXABLE"
  };
}

function buildDefaultServiceOrderDetail(
  row: ServiceOrderWorkspaceRow,
  taskEntries: ServiceOrderTaskEntry[],
  activityEntries: ServiceOrderActivityEntry[]
): ServiceOrderDetailPayload {
  const seed = resolveServiceSeed(row.roNumber);
  const units = buildServiceWorkbenchUnits(row, seed);
  const jobs = buildServiceWorkbenchJobs(row, units, seed);
  const totals = buildServiceOrderTotals(jobs, buildServiceWorkbenchMiscCharges(row, seed), row.orderType === "Estimate");

  return {
    roNumber: row.roNumber,
    customerAddress: buildServiceCustomerAddress(seed),
    homePhone: buildServicePhone(seed),
    workPhone: buildServicePhone(seed + 11),
    cellPhone: buildServicePhone(seed + 21),
    email: buildServiceEmail(row.customerName),
    customerNo: `${seed}${(seed % 97).toString().padStart(2, "0")}`,
    setupDate: shiftUsDate(row.inDate, -21),
    loyaltyPoints: `${(seed % 7) * 50}`,
    promisedDate: shiftUsDate(row.inDate, row.orderType === "Estimate" ? 7 : row.roStatus === "Ready to Cash" ? 1 : row.roStatus === "In Progress" ? 2 : 4),
    closedDate: row.orderType === "Estimate" ? "" : row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 4) : "",
    purchaseOrder: `PO-${row.roNumber}`,
    jobs,
    units,
    notes: `Customer reports ${lowercaseSentence(row.note)}. Verify ${row.category.toLowerCase()} blockers, document all work under RO ${row.roNumber}, and keep ${row.serviceWriter} informed before any customer update.`,
    transferNotes: `Move ${row.stockNumber} through the ${row.category.toLowerCase()} lane only after parts and labor are posted. Route final release back to ${row.serviceWriter} for customer contact.`,
    miscCharges: buildServiceWorkbenchMiscCharges(row, seed),
    totals,
    openFollowUps: buildDefaultOpenFollowUps(row, shiftUsDate(row.inDate, 4)),
    closedFollowUps: buildDefaultClosedFollowUps(row, activityEntries),
    laborCloseout: jobs.flatMap((job) => job.laborLines),
    laborSessions: buildServiceWorkbenchLaborSessions(row, jobs, seed),
    deposits:
      row.orderType === "Estimate" || row.roStatus !== "Ready to Cash"
        ? []
        : [
            {
              invoiceNumber: `INV-${row.roNumber}`,
              date: shiftUsDate(row.inDate, 4),
              cashier: "Miles May",
              description: `RO ${row.roNumber} final payment`,
              amount: totals.totalDue,
              paymentDate: shiftUsDate(row.inDate, 4),
              cancelDate: ""
            }
          ],
    attachments: buildServiceWorkbenchAttachments(row, taskEntries),
    history: buildServiceWorkbenchHistory(row, taskEntries, activityEntries),
    signatureDocs: row.orderType === "Estimate" ? [] : buildServiceWorkbenchSignatureDocs(row, totals.total),
    orderTypeMemory:
      row.orderType === "Estimate"
        ? {
            repairOrderStatus: "Not Started",
            repairOrderCategory: "Fresh Intake",
            repairOrderTone: "salmon"
          }
        : {
            repairOrderStatus: row.roStatus,
            repairOrderCategory: row.category,
            repairOrderTone: row.tone
          }
  };
}

function buildDefaultOpenFollowUps(row: ServiceOrderWorkspaceRow, promisedDate: string): ServiceOrderFollowUp[] {
  return [
    {
      subject: row.orderType === "Estimate" ? "Estimate approval follow-up" : `${row.roStatus} update`,
      owner: row.serviceWriter,
      date: promisedDate,
      time: "12:10 PM",
      duration: "5 min",
      type: row.orderType === "Estimate" ? "Estimate" : row.roStatus === "Ready to Cash" ? "Pickup" : "Call",
      confirmed: row.roStatus === "Ready to Cash" ? "Yes" : "Pending",
      showed: row.roStatus === "Ready to Cash" ? "Yes" : "-",
      automated: "No",
      notes: row.orderType === "Estimate" ? "Confirm customer approval before converting to a repair order." : `Reach back out once ${row.category.toLowerCase()} clears.`
    }
  ];
}

function buildDefaultClosedFollowUps(row: ServiceOrderWorkspaceRow, activityEntries: ServiceOrderActivityEntry[]): ServiceOrderFollowUp[] {
  return activityEntries.slice(0, 3).map((entry) => ({
    subject: entry.label,
    owner: entry.actorName,
    date: row.inDate,
    time: entry.timeLabel,
    duration: "5 min",
    type: "Note",
    confirmed: "Yes",
    showed: "Yes",
    automated: "No",
    notes: entry.detail
  }));
}

function buildServiceWorkbenchUnits(row: ServiceOrderWorkspaceRow, seed: number): ServiceOrderUnit[] {
  const primaryYear = (2026 - (seed % 4)).toString();
  const engineByMaker: Record<string, string> = {
    PARKER: "Mercury 300 Verado",
    TIDEWATER: "Yamaha F300XB",
    HEWES: "Yamaha VF250XB",
    AVALON: "Mercury 250L",
    NAUTICSTAR: "Yamaha F225XB",
    PURSUIT: "Yamaha F350",
    "SEA HUNT": "Yamaha F250XB"
  };
  const secondaryRig = engineByMaker[row.maker.toUpperCase()] ?? "Mercury 250L";
  const [secondaryMake, ...secondaryModelParts] = secondaryRig.split(" ");

  return [
    {
      id: `${row.id}-unit-primary`,
      label: `${primaryYear}, ${row.maker} ${row.model}`,
      stockNumber: row.stockNumber,
      make: row.maker,
      model: row.model,
      year: primaryYear,
      serialNumber: `${row.stockNumber}-${(seed % 97).toString().padStart(2, "0")}`,
      unitType: row.orderType === "Estimate" ? "Estimate" : "Boat",
      location: row.stockNumber,
      hoursIn: `${seed % 40}`,
      hoursOut: `${Math.max(seed % 40, row.roStatus === "Ready to Cash" ? seed % 40 : 0)}`,
      notes: `Primary hull intake tied to ${row.category.toLowerCase()} routing for ${row.serviceWriter}.`,
      onLot: row.roStatus !== "Clocked Out"
    },
    {
      id: `${row.id}-unit-secondary`,
      label: `${primaryYear}, ${secondaryRig}`,
      stockNumber: `ENG-${(seed % 900).toString().padStart(3, "0")}`,
      make: secondaryMake,
      model: secondaryModelParts.join(" "),
      year: primaryYear,
      serialNumber: `${row.stockNumber}-P${(seed % 31).toString().padStart(2, "0")}`,
      unitType: "Outboard",
      location: row.stockNumber,
      hoursIn: `${seed % 18}`,
      hoursOut: `${row.roStatus === "Ready to Cash" ? seed % 18 : 0}`,
      notes: `Power package linked to ${row.maker} ${row.model}; verify rigging before delivery.`,
      onLot: true
    }
  ];
}

function buildServiceWorkbenchJobs(row: ServiceOrderWorkspaceRow, units: ServiceOrderUnit[], seed: number): ServiceOrderJob[] {
  const technicians = resolveServiceTechnicians(row.serviceWriter);
  const primaryParts = buildServiceWorkbenchParts(row, seed, "primary");
  const supportParts = buildServiceWorkbenchParts(row, seed, "support");
  const releaseParts = buildServiceWorkbenchParts(row, seed, "release");
  const isWarranty = row.category.toLowerCase().includes("warranty");
  const closedDate = row.orderType === "Estimate" ? "" : row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 4) : "";
  const primaryQuantity = row.orderType === "Estimate" ? 1 : row.roStatus === "Ready to Cash" ? 5 : row.roStatus === "Ready to Work" ? 3 : row.roStatus === "In Progress" ? 2 : 1;
  const secondaryQuantity = row.orderType === "Estimate" ? 0.5 : row.roStatus === "Not Started" ? 1 : 2;
  const releaseQuantity = row.orderType === "Estimate" ? 0 : row.roStatus === "Ready to Cash" ? 1.5 : 0.5;

  return [
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 1,
      title: buildServicePrimaryJobTitle(row),
      unitLabel: units[0]?.label ?? row.model,
      customerApproval: row.orderType === "Estimate" ? "Pending" : "Approved",
      status: row.orderType === "Estimate" ? "Estimate" : row.category === "Parts Hold" ? "Not Ready - Waiting on parts" : row.roStatus,
      warranty: isWarranty ? row.maker : "-",
      appliance: "None",
      description: row.note,
      resolution:
        row.orderType === "Estimate"
          ? "Estimate staged and waiting on customer authorization."
          : row.roStatus === "Ready to Cash"
            ? `Primary repair verified; ${row.maker} ${row.model} is ready for customer pickup.`
            : `Hold the unit in ${row.category.toLowerCase()} until the primary concern is cleared and documented.`,
      recommendations:
        row.orderType === "Estimate"
          ? "Confirm pricing, availability, and labor plan before converting to a repair order."
          : `Complete the main repair, confirm ${row.serviceWriter} follow-up, and attach the final RO jacket before release.`,
      technician: technicians[0],
      quantity: primaryQuantity,
      rate: 139 + (seed % 3) * 15,
      laborRate: row.orderType === "Estimate" ? "Estimate" : isWarranty ? "Warranty" : "FPC - RETAIL",
      parts: primaryParts,
      subletLines: [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? technicians[0] : "",
      techNotes: `Capture intake photos, confirm ${lowercaseSentence(row.note)}, and update the writer if parts availability changes.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed, primaryParts[0]?.partNumber ?? "", isWarranty)
    }),
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 2,
      title: buildServiceSupportJobTitle(row),
      unitLabel: units[1]?.label ?? units[0]?.label ?? row.model,
      customerApproval: row.orderType === "Estimate" ? "Pending" : "Approved",
      status: row.orderType === "Estimate" ? "Estimate" : row.roStatus === "Ready to Cash" ? "Ready to Cashier" : "No Activity",
      warranty: isWarranty ? row.maker : "-",
      appliance: row.category,
      description: `Support ${row.category.toLowerCase()} routing and confirm accessory fitment before customer contact.`,
      resolution: `Support line will clear once parts, attachments, and final labor are posted to the ${row.orderType.toLowerCase()}.`,
      recommendations: `Keep accessory and rigging documentation together so the cashier can close the order without reopening the packet.`,
      technician: technicians[1],
      quantity: secondaryQuantity,
      rate: 119 + (seed % 2) * 10,
      laborRate: row.orderType === "Estimate" ? "Estimate" : "Customer Pay - Retail Hourly",
      parts: supportParts,
      subletLines: row.category === "Rig for Sale" ? buildServiceWorkbenchSubletLines(row, seed) : [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? technicians[1] : "",
      techNotes: `Verify serial numbers, attach supporting documents, and confirm all open communication threads are resolved.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed + 7, supportParts[0]?.partNumber ?? "", false)
    }),
    buildServiceWorkbenchJob({
      row,
      seed,
      index: 3,
      title: buildServiceReleaseJobTitle(row),
      unitLabel: units[0]?.label ?? row.model,
      customerApproval: row.orderType === "Estimate" ? "Pending" : "Approved",
      status: row.orderType === "Estimate" ? "Estimate" : row.roStatus === "Ready to Cash" ? "Ready to Cashier" : "No Activity",
      warranty: "-",
      appliance: "None",
      description: `Final QA, water test planning, and delivery prep for ${row.maker} ${row.model}.`,
      resolution: row.roStatus === "Ready to Cash" ? "Release packet prepared and ready for cashier closeout." : "Hold release steps until primary repair and support work are complete.",
      recommendations: `Do not release the unit until all utility tasks, parts invoices, and warranty notes are attached.`,
      technician: technicians[0],
      quantity: releaseQuantity,
      rate: 129,
      laborRate: row.orderType === "Estimate" ? "Estimate" : "Customer Pay - NonPay Labor",
      parts: releaseParts,
      subletLines: row.category === "Consignment" ? buildServiceWorkbenchSubletLines(row, seed + 4) : [],
      closedDate,
      completedBy: row.roStatus === "Ready to Cash" ? row.serviceWriter : "",
      techNotes: `Confirm final wash, verify signatures, and set pickup expectations with the customer.`,
      warrantyClaim: buildServiceWorkbenchWarrantyClaim(row, seed + 14, releaseParts[0]?.partNumber ?? "", false)
    })
  ];
}

function buildServiceWorkbenchJob({
  row,
  seed,
  index,
  title,
  unitLabel,
  customerApproval,
  status,
  warranty,
  appliance,
  description,
  resolution,
  recommendations,
  technician,
  quantity,
  rate,
  laborRate,
  parts,
  subletLines,
  closedDate,
  completedBy,
  techNotes,
  warrantyClaim
}: {
  row: ServiceOrderWorkspaceRow;
  seed: number;
  index: number;
  title: string;
  unitLabel: string;
  customerApproval: string;
  status: string;
  warranty: string;
  appliance: string;
  description: string;
  resolution: string;
  recommendations: string;
  technician: string;
  quantity: number;
  rate: number;
  laborRate: string;
  parts: ServiceOrderPart[];
  subletLines: ServiceOrderSubletLine[];
  closedDate: string;
  completedBy: string;
  techNotes: string;
  warrantyClaim: ServiceOrderWarrantyClaim;
}): ServiceOrderJob {
  const laborTotal = roundWorkbenchCurrency(quantity * rate);
  const partsTotal = roundWorkbenchCurrency(parts.reduce((total, part) => total + part.price * part.quantity, 0));
  const subletTotal = roundWorkbenchCurrency(subletLines.reduce((total, line) => total + line.price, 0));
  const jobCode = buildJobCode(row, index + seed);

  return {
    id: `${row.id}-job-${index}`,
    title,
    unitLabel,
    customerApproval,
    status,
    warranty,
    appliance,
    description,
    resolution,
    recommendations,
    jobCode,
    technician,
    laborRate,
    chargeBy: "Hours",
    rate,
    quantity,
    total: roundWorkbenchCurrency(laborTotal + partsTotal + subletTotal),
    closedDate,
    completedBy,
    techNotes,
    parts,
    laborLines: [
      {
        technician,
        jobCode,
        description: title,
        quantity: formatWorkbenchHours(quantity),
        laborRate,
        chargeBy: "Hours",
        rate,
        total: laborTotal,
        closedDate,
        completedBy
      }
    ],
    subletLines,
    attachments: [`${row.roNumber}-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf`],
    warrantyClaim
  };
}

function buildServicePrimaryJobTitle(row: ServiceOrderWorkspaceRow) {
  const note = row.note.toLowerCase();

  if (row.orderType === "Estimate") {
    return "ESTIMATE REVIEW / DIAG";
  }

  if (note.includes("pump")) {
    return "DIAG WATER PUMP / COOLING";
  }

  if (note.includes("battery")) {
    return "INSTALL DUAL BATTERY KIT";
  }

  if (row.category.toLowerCase().includes("warranty")) {
    return `${row.maker} WARRANTY DIAG`;
  }

  if (row.category.toLowerCase().includes("rig")) {
    return `RIG ${row.maker} DELIVERY PREP`;
  }

  return `INSPECT ${row.maker} ${row.model}`;
}

function buildServiceSupportJobTitle(row: ServiceOrderWorkspaceRow) {
  if (row.orderType === "Estimate") {
    return "PARTS / LABOR QUOTE BUILD";
  }

  if (row.category.toLowerCase().includes("parts")) {
    return "PARTS / RIGGING FOLLOW-UP";
  }

  if (row.category.toLowerCase().includes("consignment")) {
    return "CONSIGNMENT PHOTO / QC REVIEW";
  }

  return "DOCUMENTATION / APPROVAL CHECK";
}

function buildServiceReleaseJobTitle(row: ServiceOrderWorkspaceRow) {
  if (row.orderType === "Estimate") {
    return "CUSTOMER APPROVAL / CONVERT";
  }

  if (row.roStatus === "Ready to Cash") {
    return "FINAL RELEASE / CASHIER HANDOFF";
  }

  return "WATER TEST / CUSTOMER RELEASE";
}

function buildServiceWorkbenchParts(row: ServiceOrderWorkspaceRow, seed: number, variant: "primary" | "support" | "release") {
  if (variant === "primary" && row.note.toLowerCase().includes("pump")) {
    return [
      {
        partNumber: `8M${(seed + 6123).toString().slice(-7)}`,
        description: "Water pump service kit",
        supplier: "MM",
        available: row.category === "Parts Hold" ? 0 : 1,
        price: 152.99,
        quantity: 1,
        category: "PMC"
      },
      {
        partNumber: `35-${(seed + 8921).toString().slice(-7)}`,
        description: "Impeller and gasket set",
        supplier: "MM",
        available: row.category === "Parts Hold" ? 0 : 2,
        price: 96.95,
        quantity: 1,
        category: "PMC"
      }
    ];
  }

  if (variant === "support") {
    return [
      {
        partNumber: `${(seed % 9000000).toString().padStart(7, "0")}-GL`,
        description: row.category === "Rig for Sale" ? "Rigging accessory kit" : row.orderType === "Estimate" ? "Quoted parts line" : "Shop supply staging kit",
        supplier: "MM",
        available: 1,
        price: row.orderType === "Estimate" ? 89.5 : 63.99,
        quantity: 1,
        category: row.category === "Rig for Sale" ? "RIG" : "SHOP"
      }
    ];
  }

  return [
    {
      partNumber: `${(seed % 8000000).toString().padStart(7, "0")}-RL`,
      description: row.roStatus === "Ready to Cash" ? "Final QC release supplies" : row.orderType === "Estimate" ? "Inspection and estimate supplies" : "Inspection and test supplies",
      supplier: "MM",
      available: 1,
      price: row.roStatus === "Ready to Cash" ? 41.53 : 27.75,
      quantity: 1,
      category: row.orderType === "Estimate" ? "EST" : "QC"
    }
  ];
}

function buildServiceWorkbenchSubletLines(row: ServiceOrderWorkspaceRow, seed: number): ServiceOrderSubletLine[] {
  return [
    {
      vendor: row.category === "Consignment" ? "Harbor Wash & Detail" : "Dealer Graphics",
      code: `SUB-${(seed % 999).toString().padStart(3, "0")}`,
      description: row.category === "Consignment" ? "Detail and showroom prep" : "Accessory fitment support",
      price: row.orderType === "Estimate" ? 0 : row.category === "Consignment" ? 145 : 95,
      invoiceNumber: `AP-${(seed % 9000).toString().padStart(4, "0")}`,
      date: shiftUsDate(row.inDate, 2)
    }
  ];
}

function buildServiceWorkbenchWarrantyClaim(row: ServiceOrderWorkspaceRow, seed: number, failedPartNumber: string, isWarranty: boolean): ServiceOrderWarrantyClaim {
  return {
    warrantyClaimNumber: isWarranty ? `${seed}` : "",
    internalWarrantyNumber: `${(seed + 162).toString().slice(-4)}`,
    failureDate: shiftUsDate(row.inDate, isWarranty ? 0 : 2),
    contentionCode: isWarranty ? "OEM" : "N/A",
    problemCode: isWarranty ? "2322" : "N/A",
    problemDescription: isWarranty
      ? `Warranty review required for ${row.maker} ${row.model} before the claim can be approved.`
      : `No warranty claim is tied to this line; customer-pay documentation remains in effect.`,
    claimType: isWarranty ? "Manufacturer" : "N/A",
    status: isWarranty ? "Not Ready - Warranty Not Approved" : "No warranty claim filed",
    deductible: 0,
    failedPartNumber,
    actionTaken: isWarranty
      ? `Submitted supporting documents to ${row.maker} warranty for review and waiting on disposition.`
      : `No claim action required; continue with customer-pay repair routing.`,
    reasonForDelay: isWarranty ? "Awaiting manufacturer disposition and supplemental authorization." : "No warranty delay on this line.",
    carrierNumber: isWarranty ? `${seed % 9}` : "",
    invoiceDate: shiftUsDate(row.inDate, 1),
    invoiceNumber: isWarranty ? `INV-${seed}` : "",
    dateFiledWithCarrier: isWarranty ? shiftUsDate(row.inDate, 1) : "",
    authorizations: isWarranty ? [`AUTH-${seed}`, `AUTH-${seed + 1}`] : ["-"],
    extraLabor: isWarranty ? [{ hours: "0.5", reason: "Documentation" }] : [{ hours: "0", reason: "N/A" }]
  };
}

function buildBlankServiceWorkbenchWarrantyClaim(): ServiceOrderWarrantyClaim {
  return {
    warrantyClaimNumber: "",
    internalWarrantyNumber: "",
    failureDate: "",
    contentionCode: "",
    problemCode: "",
    problemDescription: "",
    claimType: "",
    status: "",
    deductible: 0,
    failedPartNumber: "",
    actionTaken: "",
    reasonForDelay: "",
    carrierNumber: "",
    invoiceDate: "",
    invoiceNumber: "",
    dateFiledWithCarrier: "",
    authorizations: [],
    extraLabor: []
  };
}

function buildServiceWorkbenchMiscCharges(row: ServiceOrderWorkspaceRow, seed: number) {
  return [
    { label: "Shop Supplies", amount: roundWorkbenchCurrency(12 + (seed % 6) * 3), auto: true },
    { label: "Boat Gas", amount: row.orderType === "Estimate" ? 0 : row.roStatus === "Ready to Cash" ? 18 : 0, auto: false },
    { label: "Freight", amount: row.category === "Parts Hold" ? 24 : 0, auto: row.category === "Parts Hold" },
    { label: "Environmental Fee", amount: row.orderType === "Estimate" ? 0 : 6, auto: true },
    { label: "Discount", amount: row.roStatus === "Ready to Cash" ? -15 : 0, auto: false }
  ];
}

function buildServiceWorkbenchLaborSessions(row: ServiceOrderWorkspaceRow, jobs: ServiceOrderJob[], seed: number): ServiceOrderLaborSession[] {
  const primaryJob = jobs[0];

  return [
    {
      jobId: primaryJob.id,
      jobTitle: primaryJob.title,
      technician: primaryJob.technician,
      startDate: shiftUsDate(row.inDate, 1),
      startTime: "8:15 AM",
      endDate: row.roStatus === "Ready to Cash" ? shiftUsDate(row.inDate, 1) : "",
      endTime: row.roStatus === "Ready to Cash" ? "1:20 PM" : "",
      actualHours: formatWorkbenchHours(primaryJob.quantity),
      creditedHours: formatWorkbenchHours(Math.max(primaryJob.quantity - 0.5, 0)),
      override: seed % 2 === 0 ? "None" : "Writer review"
    }
  ];
}

function buildServiceWorkbenchAttachments(row: ServiceOrderWorkspaceRow, entries: ServiceOrderTaskEntry[]): ServiceOrderAttachment[] {
  const relatedEntries = entries.filter((entry) => entry.detail.startsWith(`${row.roNumber} ·`)).slice(0, 3);
  const customerSlug = row.customerName.split(",")[0]?.trim().toUpperCase() ?? "CUSTOMER";
  const baseAttachment: ServiceOrderAttachment = {
    name: `${customerSlug}-${row.roNumber}.pdf`,
    visibility: "Private",
    kind: row.orderType === "Estimate" ? "Estimate Packet" : "RO Jacket",
    createdBy: row.serviceWriter,
    createdTime: `${row.inDate} · 8:30 AM`,
    status: "Attached"
  };

  return [
    baseAttachment,
    ...relatedEntries.map((entry) => ({
      name: `${row.roNumber}-${entry.action.toLowerCase()}.pdf`,
      visibility: "Private",
      kind: entry.action,
      createdBy: entry.actorName,
      createdTime: entry.timeLabel,
      status: entry.status
    }))
  ];
}

function buildServiceWorkbenchSignatureDocs(row: ServiceOrderWorkspaceRow, total: number): ServiceOrderSignatureDoc[] {
  if (row.roStatus !== "Ready to Cash" || row.orderType === "Estimate") {
    return [];
  }

  return [
    {
      description: `Repair authorization · ${formatWorkbenchMoney(total)}`,
      createdBy: row.serviceWriter,
      createdTime: `${shiftUsDate(row.inDate, 3)} · 9:05 AM`,
      completedTime: `${shiftUsDate(row.inDate, 4)} · 11:40 AM`,
      status: "Signed",
      customer: "Signed",
      dealer1: "Signed",
      dealer2: "-",
      dealer3: "-",
      dealer4: "-"
    }
  ];
}

function buildServiceWorkbenchHistory(
  row: ServiceOrderWorkspaceRow,
  taskEntries: ServiceOrderTaskEntry[],
  activityEntries: ServiceOrderActivityEntry[]
): ServiceOrderHistoryLine[] {
  const roPrefix = `${row.roNumber} ·`;
  const taskHistory = taskEntries
    .filter((entry) => entry.detail.startsWith(roPrefix))
    .map((entry) => ({
      date: `${row.inDate} · ${entry.timeLabel}`,
      event: `${entry.action} ${entry.status}`,
      user: entry.lastUpdatedByName,
      detail: entry.detail,
      oldValue: entry.assignedName,
      newValue: entry.status
    }));
  const activityHistory = activityEntries
    .filter((entry) => entry.detail.includes(row.roNumber))
    .map((entry) => ({
      date: `${row.inDate} · ${entry.timeLabel}`,
      event: entry.label,
      user: entry.actorName,
      detail: entry.detail,
      oldValue: row.category,
      newValue: row.roStatus
    }));
  const fallbackHistory = [
    {
      date: `${row.inDate} · 11:15 AM`,
      event: "Customer approval changed",
      user: row.serviceWriter,
      detail: row.note,
      oldValue: "Waiting",
      newValue: row.orderType === "Estimate" ? "Pending" : "Approved"
    },
    {
      date: `${row.inDate} · 11:05 AM`,
      event: row.orderType === "Estimate" ? "Estimate opened" : "Repair order opened",
      user: row.serviceWriter,
      detail: `RO ${row.roNumber} created for ${row.customerName}.`,
      oldValue: "-",
      newValue: row.roStatus
    }
  ];

  return [...taskHistory, ...activityHistory, ...fallbackHistory].slice(0, 8);
}

function buildServiceCustomerAddress(seed: number) {
  const streets = ["Coral Lane", "Bayfront Drive", "Harbor Trace", "Anchor Point", "Pelican Bend"];
  const cities = [
    "Wimberley, Texas 78676",
    "Sarasota, Florida 34231",
    "St. Petersburg, Florida 33712",
    "Charleston, South Carolina 29412",
    "Naples, Florida 34102"
  ];
  const streetNumber = 100 + (seed % 700);

  return [`${streetNumber} ${streets[seed % streets.length]}`, cities[seed % cities.length]];
}

function buildServicePhone(seed: number) {
  const suffix = (seed % 10000).toString().padStart(4, "0");
  const middle = (500 + (seed % 400)).toString();

  return `512-${middle}-${suffix}`;
}

function buildServiceEmail(customerName: string) {
  const normalized = customerName
    .replace(/[^a-z0-9]+/gi, ".")
    .replace(/^\.+|\.+$/g, "")
    .toLowerCase();

  return `${normalized}@customer.mail`;
}

function resolveServiceTechnicians(serviceWriter: string) {
  if (serviceWriter.includes("Patrick")) {
    return ["Erik Williams", "James Hampton"];
  }

  if (serviceWriter.includes("Dustin")) {
    return ["Dylan Henrikson", "Yard Tech"];
  }

  return ["Ernest Saenz", "Corporate Use Only"];
}

function resolveServiceSeed(roNumber: string) {
  const seed = Number.parseInt(roNumber.replace(/\D/g, ""), 10);
  return Number.isFinite(seed) && seed > 0 ? seed : 1;
}

function shiftUsDate(value: string, days: number) {
  const parts = value.split("/").map((part) => Number.parseInt(part, 10));

  if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) {
    return value;
  }

  const [month, day, year] = parts;
  const date = new Date(year, month - 1, day + days);

  return new Intl.DateTimeFormat("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric"
  }).format(date);
}

function buildDefaultServiceDetailNotes(row: ServiceOrderWorkspaceRow) {
  return `Customer reports ${lowercaseSentence(row.note)}. Verify ${row.category.toLowerCase()} blockers, document all work under RO ${row.roNumber}, and keep ${row.serviceWriter} informed before any customer update.`;
}

function buildInitialServiceOrderNote(orderType: ServiceOrderWorkspaceRow["orderType"]) {
  return orderType === "Estimate"
    ? "New estimate intake awaiting writer review"
    : "New repair order intake awaiting dispatch";
}

function deriveServiceOrderMaker(model: string) {
  const firstToken = model.trim().split(/\s+/)[0] ?? "";
  return firstToken ? firstToken.toUpperCase() : "SERVICE";
}

function buildDefaultServiceTransferNotes(row: ServiceOrderWorkspaceRow) {
  return `Move ${row.stockNumber} through the ${row.category.toLowerCase()} lane only after parts and labor are posted. Route final release back to ${row.serviceWriter} for customer contact.`;
}

function describeChangedServiceQueueFields(previousRow: ServiceOrderWorkspaceRow, nextRow: ServiceOrderWorkspaceRow) {
  const fieldLabels: Array<{ label: string; valueChanged: boolean }> = [
    { label: "in date", valueChanged: previousRow.inDate !== nextRow.inDate },
    { label: "RO #", valueChanged: previousRow.roNumber !== nextRow.roNumber },
    { label: "type", valueChanged: previousRow.orderType !== nextRow.orderType },
    { label: "customer", valueChanged: previousRow.customerName !== nextRow.customerName },
    { label: "stock #", valueChanged: previousRow.stockNumber !== nextRow.stockNumber },
    { label: "model", valueChanged: previousRow.model !== nextRow.model },
    { label: "writer", valueChanged: previousRow.serviceWriter !== nextRow.serviceWriter },
    { label: "status", valueChanged: previousRow.roStatus !== nextRow.roStatus },
    { label: "category", valueChanged: previousRow.category !== nextRow.category },
    { label: "maker", valueChanged: previousRow.maker !== nextRow.maker },
    { label: "notes", valueChanged: previousRow.note !== nextRow.note }
  ];

  const changed = fieldLabels.filter((field) => field.valueChanged).map((field) => field.label);
  return changed.length > 0 ? changed : ["queue details"];
}

function resolveServiceQueueTone(row: ServiceOrderWorkspaceRow, fallbackTone: ServiceOrderWorkspaceRow["tone"]) {
  const normalizedStatus = row.roStatus.toLowerCase();
  const normalizedCategory = row.category.toLowerCase();

  if (row.orderType === "Estimate") {
    return "teal";
  }

  if (normalizedStatus.includes("cancel") || normalizedCategory.includes("cancel")) {
    return "gray";
  }

  if (normalizedCategory.includes("parts hold") || normalizedStatus === "not ready") {
    return "salmon";
  }

  if (normalizedStatus === "ready to cash") {
    return "lime";
  }

  if (normalizedStatus === "ready to work" || normalizedCategory === "complete" || normalizedCategory === "warranty") {
    return "green";
  }

  if (normalizedStatus === "clocked out") {
    return "violet";
  }

  if (normalizedStatus === "in progress") {
    return "teal";
  }

  return fallbackTone;
}

function lowercaseSentence(value: string) {
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function formatWorkbenchHours(value: number) {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

function roundWorkbenchCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

function buildJobCode(row: ServiceOrderWorkspaceRow, suffixSeed: number) {
  return `${row.serviceWriter.split(" ")[0].slice(0, 3).toLowerCase()}${suffixSeed.toString().slice(-3)}`;
}

function formatWorkbenchMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(value);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
