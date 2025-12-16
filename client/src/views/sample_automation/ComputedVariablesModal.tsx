import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Modal } from '../../components/Modal';
import Icon from '@mdi/react';
import {
  mdiCalculator,
  mdiPlus,
  mdiTrashCan,
  mdiEye,
  mdiCheck,
  mdiClose,
  mdiCodeBraces,
  mdiViewList,
  mdiInformationOutline,
} from '@mdi/js';
import {
  usePreviewComputedVariableMutation,
  useAddComputedVariableMutation,
  type ComputedVariableDefinition,
  type ComputedRule,
  type Condition,
  type ConditionOperator,
  type OutputDataType,
} from '../../features/sampleAutomationApiSlice';
import { useToast } from '../../context/ToastContext';
import './ComputedVariablesModal.css';

// Operator labels with symbols
const OPERATOR_OPTIONS: { value: ConditionOperator; label: string; description: string }[] = [
  { value: 'equals', label: '= equals', description: 'Value matches exactly' },
  { value: 'not_equals', label: '≠ not equal', description: 'Value does not match' },
  { value: 'greater_than', label: '> greater than', description: 'Value is greater than (numeric)' },
  { value: 'less_than', label: '< less than', description: 'Value is less than (numeric)' },
  { value: 'greater_equal', label: '≥ greater or equal', description: 'Value is greater than or equal (numeric)' },
  { value: 'less_equal', label: '≤ less or equal', description: 'Value is less than or equal (numeric)' },
  { value: 'contains', label: '∋ contains', description: 'Value contains the text' },
  { value: 'starts_with', label: 'starts with', description: 'Value starts with the text' },
  { value: 'ends_with', label: 'ends with', description: 'Value ends with the text' },
  { value: 'is_empty', label: '∅ is empty', description: 'Value is blank or null' },
  { value: 'is_not_empty', label: '≠∅ not empty', description: 'Value is not blank' },
];

const OUTPUT_TYPE_OPTIONS: { value: OutputDataType; label: string; needsLength: boolean }[] = [
  { value: 'VARCHAR', label: 'VARCHAR (variable text)', needsLength: true },
  { value: 'INT', label: 'INT (whole number)', needsLength: false },
  { value: 'CHAR', label: 'CHAR (fixed text)', needsLength: true },
  { value: 'TEXT', label: 'TEXT (auto-sized)', needsLength: false },
];

interface ComputedVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  availableVariables: string[];
  onVariableAdded: (variableName: string, definition: ComputedVariableDefinition) => void;
  editingVariable?: ComputedVariableDefinition | null;
}

const generateId = () => `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const createEmptyCondition = (): Condition => ({
  id: generateId(),
  variable: '',
  operator: 'equals',
  value: '',
});

const createEmptyRule = (): ComputedRule => ({
  id: generateId(),
  conditions: [createEmptyCondition()],
  conditionLogic: 'AND',
  outputValue: '',
});

const createEmptyDefinition = (): ComputedVariableDefinition => ({
  id: generateId(),
  name: '',
  outputType: 'VARCHAR',
  outputLength: 50,
  rules: [createEmptyRule()],
  defaultValue: '',
  inputMode: 'visual',
});

const ComputedVariablesModal: React.FC<ComputedVariablesModalProps> = ({
  isOpen,
  onClose,
  tableName,
  availableVariables,
  onVariableAdded,
  editingVariable,
}) => {
  const toast = useToast();
  const [definition, setDefinition] = useState<ComputedVariableDefinition>(createEmptyDefinition());
  const [previewData, setPreviewData] = useState<Record<string, any>[] | null>(null);
  const [estimatedLength, setEstimatedLength] = useState<number>(0);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);

  const [previewComputedVariable, { isLoading: isPreviewing }] = usePreviewComputedVariableMutation();
  const [addComputedVariable, { isLoading: isAdding }] = useAddComputedVariableMutation();

  // Load editing variable when modal opens
  useEffect(() => {
    if (isOpen && editingVariable) {
      setDefinition(editingVariable);
    } else if (isOpen && !editingVariable) {
      setDefinition(createEmptyDefinition());
    }
  }, [isOpen, editingVariable]);

  // Reset state when modal closes
  const handleClose = useCallback(() => {
    setDefinition(createEmptyDefinition());
    setPreviewData(null);
    setEstimatedLength(0);
    setPreviewErrors([]);
    onClose();
  }, [onClose]);

  const isEditing = !!editingVariable;

  // Update definition field
  const updateDefinition = useCallback((updates: Partial<ComputedVariableDefinition>) => {
    setDefinition((prev) => ({ ...prev, ...updates }));
    setPreviewData(null); // Clear preview when definition changes
  }, []);

  // Rule management
  const addRule = useCallback(() => {
    setDefinition((prev) => ({
      ...prev,
      rules: [...prev.rules, createEmptyRule()],
    }));
  }, []);

  const removeRule = useCallback((ruleId: string) => {
    setDefinition((prev) => ({
      ...prev,
      rules: prev.rules.filter((r) => r.id !== ruleId),
    }));
  }, []);

  const updateRule = useCallback((ruleId: string, updates: Partial<ComputedRule>) => {
    setDefinition((prev) => ({
      ...prev,
      rules: prev.rules.map((r) => (r.id === ruleId ? { ...r, ...updates } : r)),
    }));
    setPreviewData(null);
  }, []);

  // Condition management
  const addCondition = useCallback((ruleId: string) => {
    setDefinition((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId ? { ...r, conditions: [...r.conditions, createEmptyCondition()] } : r
      ),
    }));
  }, []);

  const removeCondition = useCallback((ruleId: string, conditionId: string) => {
    setDefinition((prev) => ({
      ...prev,
      rules: prev.rules.map((r) =>
        r.id === ruleId
          ? { ...r, conditions: r.conditions.filter((c) => c.id !== conditionId) }
          : r
      ),
    }));
  }, []);

  const updateCondition = useCallback(
    (ruleId: string, conditionId: string, updates: Partial<Condition>) => {
      setDefinition((prev) => ({
        ...prev,
        rules: prev.rules.map((r) =>
          r.id === ruleId
            ? {
                ...r,
                conditions: r.conditions.map((c) =>
                  c.id === conditionId ? { ...c, ...updates } : c
                ),
              }
            : r
        ),
      }));
      setPreviewData(null);
    },
    []
  );

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];

    if (!definition.name.trim()) {
      errors.push('Variable name is required');
    } else if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(definition.name)) {
      errors.push('Variable name must start with a letter and contain only letters, numbers, and underscores');
    }

    if (definition.inputMode === 'visual') {
      if (definition.rules.length === 0) {
        errors.push('At least one rule is required');
      }

      definition.rules.forEach((rule, ruleIndex) => {
        if (rule.conditions.length === 0) {
          errors.push(`Rule ${ruleIndex + 1}: At least one condition is required`);
        }

        rule.conditions.forEach((cond, condIndex) => {
          if (!cond.variable) {
            errors.push(`Rule ${ruleIndex + 1}, Condition ${condIndex + 1}: Select a variable`);
          }
          if (!['is_empty', 'is_not_empty'].includes(cond.operator) && cond.value === '') {
            errors.push(`Rule ${ruleIndex + 1}, Condition ${condIndex + 1}: Enter a value`);
          }
        });

        if (rule.outputValue === '') {
          errors.push(`Rule ${ruleIndex + 1}: Enter an output value`);
        }
      });

      if (definition.defaultValue === '') {
        errors.push('Default value is required');
      }
    } else {
      if (!definition.formula?.trim()) {
        errors.push('Formula is required');
      }
    }

    if (['VARCHAR', 'CHAR'].includes(definition.outputType) && !definition.outputLength) {
      errors.push('Output length is required for VARCHAR/CHAR types');
    }

    return errors;
  }, [definition]);

  const isValid = validationErrors.length === 0;

  // Preview handler
  const handlePreview = useCallback(async () => {
    if (!isValid) {
      toast.error('Please fix validation errors before previewing');
      return;
    }

    try {
      const result = await previewComputedVariable({
        tableName,
        variableDefinition: definition,
      }).unwrap();

      if (result.success) {
        setPreviewData(result.sampleData);
        setEstimatedLength(result.estimatedLength);
        setPreviewErrors([]);
      } else {
        setPreviewErrors(result.errors || ['Failed to preview']);
        setPreviewData(null);
      }
    } catch (error: any) {
      setPreviewErrors([error.data?.message || 'Failed to preview variable']);
      setPreviewData(null);
    }
  }, [isValid, definition, tableName, previewComputedVariable, toast]);

  // Apply handler
  const handleApply = useCallback(async () => {
    if (!isValid) {
      toast.error('Please fix validation errors before applying');
      return;
    }

    try {
      const result = await addComputedVariable({
        tableName,
        variableDefinition: definition,
      }).unwrap();

      if (result.success) {
        toast.success(
          `Variable "${result.newColumnName}" ${isEditing ? 'updated' : 'created'} (${result.rowsUpdated} rows updated in ${result.executionTimeMs}ms)`,
          isEditing ? 'Variable Updated' : 'Variable Added'
        );
        onVariableAdded(result.newColumnName, definition);
        handleClose();
      }
    } catch (error: any) {
      toast.error(error.data?.message || 'Failed to add variable', 'Error');
    }
  }, [isValid, definition, tableName, addComputedVariable, toast, onVariableAdded, handleClose, isEditing]);

  // Check if operator needs a value input
  const operatorNeedsValue = (operator: ConditionOperator) => {
    return !['is_empty', 'is_not_empty'].includes(operator);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <div className="computed-variables-modal">
        <div className="cvm-header">
          <h2>
            <Icon path={mdiCalculator} size={1} />
            {isEditing ? 'Edit Variable' : 'Create Variable'}
          </h2>
          <button className="cvm-close-btn" onClick={handleClose}>
            <Icon path={mdiClose} size={0.875} />
          </button>
        </div>

        <div className="cvm-content">
          {/* Variable Name */}
          <div className="cvm-field">
            <label htmlFor="variable-name">Variable Name</label>
            <input
              id="variable-name"
              type="text"
              placeholder="e.g., VOTER_SEGMENT"
              value={definition.name}
              onChange={(e) => updateDefinition({ name: e.target.value.toUpperCase() })}
              className="cvm-input"
            />
          </div>

          {/* Mode Tabs */}
          <div className="cvm-mode-tabs">
            <button
              className={`cvm-mode-tab ${definition.inputMode === 'visual' ? 'active' : ''}`}
              onClick={() => updateDefinition({ inputMode: 'visual' })}
            >
              <Icon path={mdiViewList} size={0.75} />
              Visual Builder
            </button>
            <button
              className={`cvm-mode-tab ${definition.inputMode === 'formula' ? 'active' : ''}`}
              onClick={() => updateDefinition({ inputMode: 'formula' })}
            >
              <Icon path={mdiCodeBraces} size={0.75} />
              Formula Mode
            </button>
          </div>

          {/* Visual Builder Mode */}
          {definition.inputMode === 'visual' && (
            <div className="cvm-visual-builder">
              {/* Rules */}
              {definition.rules.map((rule, ruleIndex) => (
                <div key={rule.id} className="cvm-rule">
                  <div className="cvm-rule-header">
                    <span className="cvm-rule-label">Rule {ruleIndex + 1}</span>
                    {definition.rules.length > 1 && (
                      <button
                        className="cvm-rule-delete"
                        onClick={() => removeRule(rule.id)}
                        title="Delete rule"
                      >
                        <Icon path={mdiTrashCan} size={0.625} />
                      </button>
                    )}
                  </div>

                  {/* Conditions */}
                  <div className="cvm-conditions">
                    {rule.conditions.map((condition, condIndex) => (
                      <div key={condition.id} className="cvm-condition">
                        {condIndex > 0 && (
                          <select
                            className="cvm-logic-select"
                            value={rule.conditionLogic}
                            onChange={(e) =>
                              updateRule(rule.id, {
                                conditionLogic: e.target.value as 'AND' | 'OR',
                              })
                            }
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}
                        {condIndex === 0 && <span className="cvm-if-label">If</span>}

                        <select
                          className="cvm-variable-select"
                          value={condition.variable}
                          onChange={(e) =>
                            updateCondition(rule.id, condition.id, { variable: e.target.value })
                          }
                        >
                          <option value="">Select variable...</option>
                          {availableVariables.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>

                        <select
                          className="cvm-operator-select"
                          value={condition.operator}
                          onChange={(e) =>
                            updateCondition(rule.id, condition.id, {
                              operator: e.target.value as ConditionOperator,
                            })
                          }
                          title={
                            OPERATOR_OPTIONS.find((o) => o.value === condition.operator)?.description
                          }
                        >
                          {OPERATOR_OPTIONS.map((op) => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>

                        {operatorNeedsValue(condition.operator) && (
                          <input
                            type="text"
                            className="cvm-value-input"
                            placeholder="Value"
                            value={condition.value}
                            onChange={(e) =>
                              updateCondition(rule.id, condition.id, { value: e.target.value })
                            }
                          />
                        )}

                        <div className="cvm-condition-actions">
                          <button
                            className="cvm-add-condition"
                            onClick={() => addCondition(rule.id)}
                            title="Add condition"
                          >
                            <Icon path={mdiPlus} size={0.5} />
                          </button>
                          {rule.conditions.length > 1 && (
                            <button
                              className="cvm-remove-condition"
                              onClick={() => removeCondition(rule.id, condition.id)}
                              title="Remove condition"
                            >
                              <Icon path={mdiClose} size={0.5} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Rule Output */}
                  <div className="cvm-rule-output">
                    <span className="cvm-then-label">Then:</span>
                    <input
                      type="text"
                      className="cvm-output-input"
                      placeholder="Output value"
                      value={rule.outputValue}
                      onChange={(e) => updateRule(rule.id, { outputValue: e.target.value })}
                    />
                  </div>
                </div>
              ))}

              <button className="cvm-add-rule" onClick={addRule}>
                <Icon path={mdiPlus} size={0.625} />
                Add Rule
              </button>

              {/* Default Value */}
              <div className="cvm-default-value">
                <label>Otherwise (default):</label>
                <input
                  type="text"
                  className="cvm-input"
                  placeholder="Default value when no rules match"
                  value={definition.defaultValue}
                  onChange={(e) => updateDefinition({ defaultValue: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Formula Mode */}
          {definition.inputMode === 'formula' && (
            <div className="cvm-formula-mode">
              <div className="cvm-formula-help">
                <Icon path={mdiInformationOutline} size={0.75} />
                <span>
                  Enter a SQL CASE expression. Example:
                  <code>
                    CASE WHEN [AGERANGE] {'>'}= 3 THEN 'Senior' ELSE 'Young' END
                  </code>
                </span>
              </div>

              <textarea
                className="cvm-formula-input"
                placeholder="CASE&#10;  WHEN [VARIABLE] = 'value' THEN 'result'&#10;  ELSE 'default'&#10;END"
                value={definition.formula || ''}
                onChange={(e) => updateDefinition({ formula: e.target.value })}
                rows={8}
              />

              <div className="cvm-available-vars">
                <strong>Available Variables:</strong>
                <div className="cvm-var-list">
                  {availableVariables.slice(0, 20).map((v) => (
                    <span key={v} className="cvm-var-tag">
                      {v}
                    </span>
                  ))}
                  {availableVariables.length > 20 && (
                    <span className="cvm-var-more">+{availableVariables.length - 20} more</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Output Type */}
          <div className="cvm-output-config">
            <div className="cvm-field">
              <label>Output Type</label>
              <select
                className="cvm-select"
                value={definition.outputType}
                onChange={(e) => updateDefinition({ outputType: e.target.value as OutputDataType })}
              >
                {OUTPUT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {['VARCHAR', 'CHAR'].includes(definition.outputType) && (
              <div className="cvm-field cvm-field-small">
                <label>Length</label>
                <input
                  type="number"
                  className="cvm-input"
                  min={1}
                  max={4000}
                  value={definition.outputLength || ''}
                  onChange={(e) =>
                    updateDefinition({ outputLength: parseInt(e.target.value) || undefined })
                  }
                />
                {estimatedLength > 0 && (
                  <span className="cvm-estimated-length">
                    (suggested: {estimatedLength})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Validation Errors */}
          {validationErrors.length > 0 && (
            <div className="cvm-validation-errors">
              {validationErrors.map((err, i) => (
                <div key={i} className="cvm-error">
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview Errors */}
          {previewErrors.length > 0 && (
            <div className="cvm-preview-errors">
              {previewErrors.map((err, i) => (
                <div key={i} className="cvm-error">
                  {err}
                </div>
              ))}
            </div>
          )}

          {/* Preview Table */}
          {previewData && previewData.length > 0 && (
            <div className="cvm-preview">
              <h4>Preview (first 10 rows)</h4>
              <div className="cvm-preview-table-wrapper">
                <table className="cvm-preview-table">
                  <thead>
                    <tr>
                      {Object.keys(previewData[0]).map((col) => (
                        <th
                          key={col}
                          className={col === definition.name.toUpperCase() ? 'highlight' : ''}
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, i) => (
                      <tr key={i}>
                        {Object.entries(row).map(([col, val]) => (
                          <td
                            key={col}
                            className={col === definition.name.toUpperCase() ? 'highlight' : ''}
                          >
                            {val ?? '(null)'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="cvm-footer">
          <button
            className="cvm-btn cvm-btn-secondary"
            onClick={handlePreview}
            disabled={!isValid || isPreviewing}
          >
            <Icon path={mdiEye} size={0.75} />
            {isPreviewing ? 'Previewing...' : 'Preview'}
          </button>
          <button className="cvm-btn cvm-btn-cancel" onClick={handleClose}>
            Cancel
          </button>
          <button
            className="cvm-btn cvm-btn-primary"
            onClick={handleApply}
            disabled={!isValid || isAdding}
          >
            <Icon path={mdiCheck} size={0.75} />
            {isAdding ? 'Applying...' : isEditing ? 'Update Variable' : 'Apply Variable'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ComputedVariablesModal;
