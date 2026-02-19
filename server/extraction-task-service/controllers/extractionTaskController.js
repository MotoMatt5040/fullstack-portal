const ExtractionTaskServices = require('../services/ExtractionTaskServices');
const XLSX = require('xlsx');

/**
 * Async handler wrapper
 */
const handleAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Parses the uploaded Excel file to extract the project ID and relevant rows for extraction task.
 * @param {Object} file - The uploaded file object
 * @returns {Object} - Parsed data including projectId and extracted rows
 */
const parseFile = (file) => {
  const workbook = XLSX.read(file.buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  // header: 'A' gives you objects keyed by column letter
  // { A: ..., B: ..., C: ..., E: ... }
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 'A' });
  // Project ID is in the 1st row, column A, first 5 chars
  const projectId = rows[0]['A'].toString().substring(0, 5);
  const result = [];

  // For each row, if column C is 'Y',
  // extract alias from column B and position from column E
  for (const row of rows) {
    if (row['C'] === 'Y') {
      result.push({
        alias: row['B'],
        columnPos: row['E'],
        // displayName: row['D'],
        fieldLength: row['G'],
      });
    }
  }

  return { projectId, data: result };
};

const buildPhoneSelectedQuestions = (variables) => {
  const selectedQuestions = variables.map((variable, index) => ({
    Id: index + 1,
    Alias: variable.alias,
    Name: variable.alias,
    DisplayName: variable.alias,
    ColumnPosition: variable.columnPos,
    RecordPosition: 1,
    FieldLength: variable.fieldLength,
  }));
  return selectedQuestions;
};

/**
 * Builds the extraction task payload with static defaults and dynamic fields.
 * @param {string} name - Task name and DestinationFileName (e.g. projectID + "DAT")
 * @param {number} voxcoId - Voxco survey ID
 * @param {Array} questions - Array of question objects with necessary details for the extraction task
 * @return {Object} - The complete payload object for creating an extraction task in VOXCO
 */
const buildPhoneExtractionPayload = (name, voxcoId, variables) => {
  const questions = buildPhoneSelectedQuestions(variables);
  const date = new Date().toISOString();
  name = name + 'Test';
  const payload = {
    Title: name,
    ProjectId: voxcoId, // voxcoID
    ProjectName: null,
    UserId: 76139,
    UserName: 'VoxcoAPIUser',
    TaskClassName: 'DTSRemoteExportTask',
    CreatedOn: date,
    LastRunDate: null,
    AdaptorName: '',
    DtsType: 5,
    SourceFileName: name,
    TaskType: 1,
    ScheduleCount: 0,
    ScheduleNextRun: null,
    ScheduleTitle: null,
    ImportTaskConfiguration: null,
    ExtractTaskConfiguration: {
      TaskName: 'DTSRemoteExportTask',
      UserId: 76139,
      ProjectId: null, // databaseID voxcoID+1
      ProjectName: null,
      Adaptor: 5,
      Language: '01',
      IncludeOpenEnds: false,
      IncludeCallHistory: false,
      IncludeLabelAccess: false,
      ExtractAllFields: false,
      StripHtml: true,
      IncludeTimeSlots: false,
      IncludeTimeQuotas: false,
      IncludeCallBackSettings: false,
      IncludeFieldOptions: false,
      IncludeRolesInfo: false,
      UseStartNumberingRespondent: false,
      StartNumberingRespondentAt: 1,
      UseSEQSequentialNumbering: false,
      FieldDelimitor: null,
      AlwaysEncloseFields: false,
      IncludeHeader: false,
      MergeMultipleOpenEnd: false,
      Encoding: 'Windows-1252',
      AllowRenumbering: false,
      DapresyDataFormat: false,
      DichotomizedMultiple: false,
      DichotomizedMultipleWithMissing: false,
      DichotomizedHeaderChoice: 'index',
      SpssVersion: null,
      SpssOpenEndFieldSize: 0,
      ReplaceEmptyWithMinus9999And9998: false,
      OpenEndDisposition: 'OnSeparateLine',
      OpenEndLenght: 500,
      TripleS: false,
      TripleSXML: false,
      SPSS: false,
      SAS: false,
      COSI: false,
      QuantumAxix: false,
      StatXP: false,
      ADL: false,
      MaxRecordWidth: 0,
      SourceFilterDefinition: {
        FilterId: 0,
        FilterTitle: null,
        ProjectId: null,
        QuestionList: null,
        Location: '',
        DialingMode: -1,
        TimeSlotMode: -1,
        TimeSlotId: null,
        TimeSlotOperator: null,
        TimeSlotHitCount: null,
        LastDialingMode: 0,
        RespondentCase: 5,
        RespondentState: 1,
        LastCallDateTime: null,
        CallBackDateTime: null,
        IsLastCallDateTimeTreadtedSeperatly: false,
        IsCallbackDateTimeTreatedSeperatly: false,
        IsCallBack: false,
        IsNotRecoded: false,
        ViewAdditionalColumns: null,
        QuestionHasOpenEnd: '',
        IsNotInClosedStrata: false,
        InterviewerIds: '',
        ResultCodes: '',
        LastCallResultCodes: '',
        Languages: '',
        UserTimeZone: 0,
        LinkedToA4S: 1,
        IsMissingRecords: false,
        IsMissingRecordsPronto: false,
        ExcludeRecordsInInterview: false,
        SqlStatementWithOrWithoutEquation: null,
        Equation: '',
        UseCurrentDateForStartCallBack: false,
        CallBackDateTimeFromDate: '1899-12-31T00:00:00.000',
        CallBackDateTimeFromTime: '1899-12-31T00:00:00.000',
        UseCurrentDateForEndCallBack: false,
        CallBackDateTimeToDate: '1899-12-31T00:00:00.000',
        CallBackDateTimeToTime: '1899-12-31T00:00:00.000',
        UseCurrentDateForStartLastCall: false,
        LastCallDateTimeStartDate: '1899-12-31T00:00:00.000',
        LastCallDateTimeStartTime: '1899-12-31T00:00:00.000',
        UseCurrentDateForEndLastCall: false,
        LastCallDateTimeEndDate: '1899-12-31T00:00:00.000',
        LastCallDateTimeEndTime: '1899-12-31T00:00:00.000',
        IsValid: false,
        Summary: null,
        Count: 0,
        CyclePhoneNumber: -1,
        KeywordFilter: [],
        Selection: 0,
        State: 0,
        NumberOfCases: 0,
        AgentId: 0,
        IsAnonymized: null,
        MaxRecords: 0,
        CaseFilterType: 0,
        LastModificationDateTimeStartDate: null,
        IsLastModificationDateTimeTreatedSeperatly: false,
        CompletedDateTime: null,
        IsCompletedDateTimeTreatedSeperatly: false,
        CompletedDateTimeStartDate: null,
        CompletedDateTimeEndDate: null,
      },
      SelectedQuestions: questions,
      DestinationFile: name,
      DestinationFileFormat: 'TXT',
      FileServerPath:
        'C:\\Program Files (x86)\\Voxco\\A4S\\Temp\\ExportedFiles\\context_12\\project_' +
        voxcoId,
      ExportedFileNames: name,
    },
    TaskStatus: 0,
    ExecutionProgress: null,
    TaskResultMessage: null,
  };
  return payload;
};

/**
 * Handles the creation of an extraction task in VOXCO.
 */
const handleCreateExtractionTask = handleAsync(async (req, res) => {
  const file = req.file;
  const suffix = req.body.suffix ?? 'COM'; // Default to 'COM' if no suffix provided

  // Likely blocked already on frontend, but double check here
  if (!file) {
    return res.status(400).json({ error: 'File is required' });
  }

  const parsedData = parseFile(file);
  const voxcoID = await ExtractionTaskServices.getVoxcoID(
    parsedData.projectId,
    suffix,
  );

  if (!voxcoID) {
    return res.status(404).json({ error: 'Project not found in VOXCO' });
  }

  const name = parsedData.projectId + 'DAT';
  const variables = parsedData.data;
  const payload = buildPhoneExtractionPayload(name, voxcoID, variables);

  const result = await ExtractionTaskServices.createExtractionTask(
    JSON.stringify(payload, voxcoID),
  );
  res
    .status(200)
    .json({ message: 'File processed successfully.', data: payload });
});

module.exports = {
  handleCreateExtractionTask,
};
