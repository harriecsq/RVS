/**
 * Design Tokens Usage Example
 * 
 * This file demonstrates how to use Neuron Design Tokens in detail view screens.
 * Reference this when refactoring ViewBillingScreen, ViewExpenseScreen, etc.
 */

import React, { useState } from 'react';
import { ArrowLeft, Clock, Edit3 } from 'lucide-react';
import { 
  NEURON_STYLES, 
  NEURON_COLORS,
  NEURON_SPACING,
  createHoverHandlers 
} from './neuron-design-tokens';
import { StandardButton, StandardTabs } from './index';

interface ExampleDetailViewProps {
  recordId: string;
  onBack: () => void;
}

export function ExampleDetailView({ recordId, onBack }: ExampleDetailViewProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'related'>('overview');
  
  // Sample data
  const [clientName, setClientName] = useState('Acme Corporation');
  const [billingDate, setBillingDate] = useState('01-15-2024');
  const totalAmount = 50000.00;
  const status = 'Approved';
  const recordNumber = 'BIL-2024-001';
  
  return (
    <div style={{ 
      background: NEURON_COLORS.background.secondary,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* ===== HEADER ===== */}
      <div style={NEURON_STYLES.pageHeader}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: NEURON_SPACING.lg }}>
            {/* Back Button */}
            <button
              onClick={onBack}
              style={NEURON_STYLES.backButton}
              {...createHoverHandlers(NEURON_COLORS.interactive.hover)}
            >
              <ArrowLeft size={20} />
            </button>
            
            {/* Page Title */}
            <h1 style={NEURON_STYLES.pageTitle}>
              {recordNumber}
            </h1>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: NEURON_SPACING.md, alignItems: 'center' }}>
            {/* Activity Button */}
            <button
              onClick={() => setShowTimeline(!showTimeline)}
              style={{
                ...NEURON_STYLES.activityButton,
                ...(showTimeline ? NEURON_STYLES.activityButtonActive : {})
              }}
              {...createHoverHandlers(
                showTimeline ? undefined : NEURON_COLORS.interactive.hover
              )}
            >
              <Clock size={16} />
              Activity
            </button>

            {/* Edit/Save Buttons */}
            {!isEditing && (
              <StandardButton
                variant="secondary"
                icon={<Edit3 size={16} />}
                onClick={() => setIsEditing(true)}
              >
                Edit Record
              </StandardButton>
            )}

            {isEditing && (
              <>
                <StandardButton
                  variant="secondary"
                  onClick={() => setIsEditing(false)}
                >
                  Cancel
                </StandardButton>
                <StandardButton
                  variant="primary"
                  onClick={() => {
                    setIsEditing(false);
                    // Save logic here
                  }}
                >
                  Save Changes
                </StandardButton>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ===== METADATA BAR ===== */}
      <div style={NEURON_STYLES.metadataBar}>
        {/* Total Amount */}
        <div>
          <div style={NEURON_STYLES.metadataLabel}>
            Total Amount
          </div>
          <div style={NEURON_STYLES.metadataValue}>
            ₱{totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Separator */}
        <div style={NEURON_STYLES.separator} />

        {/* Status */}
        <div>
          <div style={NEURON_STYLES.metadataLabel}>
            Status
          </div>
          <div style={NEURON_STYLES.metadataValueSmall}>
            {status}
          </div>
        </div>

        {/* Separator */}
        <div style={NEURON_STYLES.separator} />

        {/* Date */}
        <div>
          <div style={NEURON_STYLES.metadataLabel}>
            Billing Date
          </div>
          <div style={NEURON_STYLES.metadataValueSmall}>
            {billingDate}
          </div>
        </div>
      </div>

      {/* ===== TAB NAVIGATION ===== */}
      <StandardTabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'related', label: 'Related Records' },
        ]}
        activeTab={activeTab}
        onChange={(tabId) => setActiveTab(tabId as 'overview' | 'related')}
      />

      {/* ===== CONTENT AREA ===== */}
      <div style={NEURON_STYLES.contentArea}>
        <div style={NEURON_STYLES.contentPadding}>
          {activeTab === 'overview' && (
            <>
              {/* ===== SECTION: GENERAL INFORMATION ===== */}
              <div style={NEURON_STYLES.sectionCard}>
                <h3 style={NEURON_STYLES.sectionTitle}>
                  General Information
                </h3>
                
                {/* 2-Column Grid */}
                <div style={NEURON_STYLES.grid2Col}>
                  {/* Field: Record Number (Read-only) */}
                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      Record Number
                    </div>
                    <div style={NEURON_STYLES.readOnlyField}>
                      {recordNumber}
                    </div>
                  </div>

                  {/* Field: Billing Date (Editable) */}
                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      Billing Date
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={billingDate}
                        onChange={(e) => setBillingDate(e.target.value)}
                        placeholder="MM-DD-YYYY"
                        style={NEURON_STYLES.input}
                      />
                    ) : (
                      <div style={NEURON_STYLES.readOnlyField}>
                        {billingDate}
                      </div>
                    )}
                  </div>

                  {/* Field: Client Name (Editable) */}
                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      Client Name
                    </div>
                    {isEditing ? (
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        style={NEURON_STYLES.input}
                      />
                    ) : (
                      <div style={NEURON_STYLES.readOnlyField}>
                        {clientName}
                      </div>
                    )}
                  </div>

                  {/* Field: Status (Read-only with color) */}
                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      Status
                    </div>
                    <div style={{
                      ...NEURON_STYLES.readOnlyField,
                      color: NEURON_COLORS.status.approved,
                      fontWeight: 600
                    }}>
                      {status}
                    </div>
                  </div>
                </div>
              </div>

              {/* ===== SECTION: SHIPMENT DETAILS ===== */}
              <div style={NEURON_STYLES.sectionCard}>
                <h3 style={NEURON_STYLES.sectionTitle}>
                  Shipment Details
                </h3>
                
                <div style={NEURON_STYLES.grid2Col}>
                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      Vessel/Voyage
                    </div>
                    <div style={NEURON_STYLES.readOnlyField}>
                      MV Ocean Star V123
                    </div>
                  </div>

                  <div>
                    <div style={NEURON_STYLES.fieldLabel}>
                      BL Number
                    </div>
                    <div style={NEURON_STYLES.readOnlyField}>
                      BL-2024-12345
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab === 'related' && (
            <div style={NEURON_STYLES.sectionCard}>
              <h3 style={NEURON_STYLES.sectionTitle}>
                Related Records
              </h3>
              <p style={{ color: NEURON_COLORS.text.secondary }}>
                Related records content goes here...
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * KEY PATTERNS TO REMEMBER:
 * 
 * 1. Page Structure:
 *    - Header (white, border bottom)
 *    - Metadata Bar (gradient, thick border)
 *    - Tabs
 *    - Content Area (light gray background)
 * 
 * 2. Section Cards:
 *    - Use NEURON_STYLES.sectionCard for container
 *    - Use NEURON_STYLES.sectionTitle for title (TEAL GREEN!)
 *    - Use 32px padding
 * 
 * 3. Form Fields:
 *    - Label: NEURON_STYLES.fieldLabel (13px, medium weight, 8px margin)
 *    - Read-only: NEURON_STYLES.readOnlyField (has box with background)
 *    - Editable: NEURON_STYLES.input (white background, border)
 * 
 * 4. Colors:
 *    - Section titles = TEAL GREEN (#0F766E)
 *    - Text = DEEP GREEN (#12332B)
 *    - Labels = GRAY (#667085)
 * 
 * 5. Spacing:
 *    - Card padding = 32px
 *    - Input padding = 10px 12px
 *    - Label margin = 8px
 *    - Section margin = 24px
 */
