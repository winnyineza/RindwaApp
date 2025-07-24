// Comprehensive IncidentTable Component Tests
import React from 'react';
import { render } from '@testing-library/react';
import { screen, fireEvent, waitFor, within } from '@testing-library/dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IncidentTable } from '../../src/components/dashboard/IncidentTable';
import { AuthProvider } from '../../src/components/auth/AuthProvider';
import { ThemeProvider } from '../../src/contexts/ThemeContext';
import '@testing-library/jest-dom';

// Mock the API
jest.mock('../../src/lib/api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  }
}));

// Mock the date utilities
jest.mock('../../src/utils/dateUtils', () => ({
  formatDate: jest.fn((date) => `Formatted: ${date}`),
  getRelativeTime: jest.fn((date) => `${Math.abs(new Date().getTime() - new Date(date).getTime())} ago`),
  formatDateWithTime: jest.fn((date) => `${date} with time`)
}));

// Mock the auth hook
const mockAuth = {
  user: {
    id: 'test-user-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role: 'station_admin',
    organizationId: 'test-org-id',
    stationId: 'test-station-id'
  },
  token: 'test-token',
  isAuthenticated: true,
  login: jest.fn(),
  logout: jest.fn(),
  loading: false
};

jest.mock('../../src/hooks/useAuth', () => ({
  useAuth: () => mockAuth
}));

// Test data
const mockIncidents = [
  {
    id: '1',
    title: 'Emergency Incident 1',
    description: 'Critical emergency requiring immediate attention',
    type: 'police',
    priority: 'critical',
    status: 'reported',
    location: { address: 'Kigali City Center', lat: -1.9441, lng: 30.0619 },
    reportedById: 'citizen-1',
    reportedBy: {
      firstName: 'John',
      lastName: 'Citizen',
      email: 'john@example.com'
    },
    stationId: 'test-station-id',
    organizationId: 'test-org-id',
    upvoteCount: 5,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'Medium Priority Issue',
    description: 'Standard incident that needs attention',
    type: 'medical',
    priority: 'medium',
    status: 'assigned',
    location: { address: 'Nyarutarama Road', lat: -1.9355, lng: 30.0928 },
    reportedById: 'citizen-2',
    reportedBy: {
      firstName: 'Jane',
      lastName: 'Reporter',
      email: 'jane@example.com'
    },
    assignedToId: 'staff-1',
    assignedTo: {
      firstName: 'Staff',
      lastName: 'Member',
      email: 'staff@example.com'
    },
    stationId: 'test-station-id',
    organizationId: 'test-org-id',
    upvoteCount: 2,
    createdAt: '2024-01-14T15:45:00Z',
    updatedAt: '2024-01-14T16:00:00Z'
  },
  {
    id: '3',
    title: 'Resolved Case',
    description: 'This incident has been successfully resolved',
    type: 'fire',
    priority: 'low',
    status: 'resolved',
    location: { address: 'Kimisagara', lat: -1.9659, lng: 30.0588 },
    reportedById: 'citizen-3',
    reportedBy: {
      firstName: 'Bob',
      lastName: 'Citizen',
      email: 'bob@example.com'
    },
    assignedToId: 'staff-2',
    assignedTo: {
      firstName: 'Another',
      lastName: 'Staff',
      email: 'staff2@example.com'
    },
    stationId: 'test-station-id',
    organizationId: 'test-org-id',
    upvoteCount: 1,
    resolution: 'Issue resolved successfully',
    createdAt: '2024-01-13T09:20:00Z',
    updatedAt: '2024-01-13T14:30:00Z',
    resolvedAt: '2024-01-13T14:30:00Z'
  }
];

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  });

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('IncidentTable Component', () => {
  let mockApi: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock API responses
    mockApi = require('../../src/lib/api').api;
    mockApi.get.mockResolvedValue({
      data: mockIncidents
    });
  });

  // =====================================================
  // BASIC RENDERING TESTS
  // =====================================================

  describe('Basic Rendering', () => {
    it('should render incident table with all incidents', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Verify all incidents are displayed
      expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
      expect(screen.getByText('Resolved Case')).toBeInTheDocument();

      // Verify table headers
      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
      expect(screen.getByText('Priority')).toBeInTheDocument();
      expect(screen.getByText('Assigned To')).toBeInTheDocument();
      expect(screen.getByText('Reported By')).toBeInTheDocument();
      expect(screen.getByText('Created')).toBeInTheDocument();
    });

    it('should show loading state initially', () => {
      mockApi.get.mockImplementation(() => new Promise(() => {})); // Never resolves

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('should show error state when API fails', async () => {
      mockApi.get.mockRejectedValue(new Error('API Error'));

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });
    });

    it('should show empty state when no incidents', async () => {
      mockApi.get.mockResolvedValue({ data: [] });

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText(/no incidents/i)).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // STATUS DISPLAY TESTS
  // =====================================================

  describe('Status Display', () => {
    it('should display correct status badges with appropriate styling', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Check status badges
      const reportedBadge = screen.getByText('reported');
      const assignedBadge = screen.getByText('assigned');
      const resolvedBadge = screen.getByText('resolved');

      expect(reportedBadge).toBeInTheDocument();
      expect(assignedBadge).toBeInTheDocument();
      expect(resolvedBadge).toBeInTheDocument();

      // Verify status-specific styling (classes)
      expect(reportedBadge).toHaveClass(/reported/);
      expect(assignedBadge).toHaveClass(/assigned/);
      expect(resolvedBadge).toHaveClass(/resolved/);
    });

    it('should display correct priority badges', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('critical')).toBeInTheDocument();
      });

      // Check priority badges
      expect(screen.getByText('critical')).toBeInTheDocument();
      expect(screen.getByText('medium')).toBeInTheDocument();
      expect(screen.getByText('low')).toBeInTheDocument();

      // Verify priority-specific styling
      const criticalBadge = screen.getByText('critical');
      const mediumBadge = screen.getByText('medium');
      const lowBadge = screen.getByText('low');

      expect(criticalBadge).toHaveClass(/critical/);
      expect(mediumBadge).toHaveClass(/medium/);
      expect(lowBadge).toHaveClass(/low/);
    });

    it('should display incident type icons correctly', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Check for type indicators (implementation dependent)
      const policeIncident = screen.getByText('Emergency Incident 1').closest('tr');
      const medicalIncident = screen.getByText('Medium Priority Issue').closest('tr');
      const fireIncident = screen.getByText('Resolved Case').closest('tr');

      expect(policeIncident).toHaveTextContent('police');
      expect(medicalIncident).toHaveTextContent('medical');
      expect(fireIncident).toHaveTextContent('fire');
    });
  });

  // =====================================================
  // FILTERING TESTS
  // =====================================================

  describe('Filtering Functionality', () => {
    it('should filter incidents by status', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Find and use status filter
      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'resolved' } });

      await waitFor(() => {
        expect(screen.getByText('Resolved Case')).toBeInTheDocument();
        expect(screen.queryByText('Emergency Incident 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Medium Priority Issue')).not.toBeInTheDocument();
      });
    });

    it('should filter incidents by priority', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Find and use priority filter
      const priorityFilter = screen.getByLabelText(/filter by priority/i);
      fireEvent.change(priorityFilter, { target: { value: 'critical' } });

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
        expect(screen.queryByText('Medium Priority Issue')).not.toBeInTheDocument();
        expect(screen.queryByText('Resolved Case')).not.toBeInTheDocument();
      });
    });

    it('should filter incidents by type', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
      });

      // Find and use type filter
      const typeFilter = screen.getByLabelText(/filter by type/i);
      fireEvent.change(typeFilter, { target: { value: 'medical' } });

      await waitFor(() => {
        expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
        expect(screen.queryByText('Emergency Incident 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Resolved Case')).not.toBeInTheDocument();
      });
    });

    it('should search incidents by title and description', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Find and use search input
      const searchInput = screen.getByPlaceholderText(/search incidents/i);
      fireEvent.change(searchInput, { target: { value: 'Emergency' } });

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
        expect(screen.queryByText('Medium Priority Issue')).not.toBeInTheDocument();
        expect(screen.queryByText('Resolved Case')).not.toBeInTheDocument();
      });
    });

    it('should combine multiple filters correctly', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Apply multiple filters
      const statusFilter = screen.getByLabelText(/filter by status/i);
      const priorityFilter = screen.getByLabelText(/filter by priority/i);

      fireEvent.change(statusFilter, { target: { value: 'assigned' } });
      fireEvent.change(priorityFilter, { target: { value: 'medium' } });

      await waitFor(() => {
        expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
        expect(screen.queryByText('Emergency Incident 1')).not.toBeInTheDocument();
        expect(screen.queryByText('Resolved Case')).not.toBeInTheDocument();
      });
    });

    it('should clear filters when reset button is clicked', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Apply filter
      const statusFilter = screen.getByLabelText(/filter by status/i);
      fireEvent.change(statusFilter, { target: { value: 'resolved' } });

      await waitFor(() => {
        expect(screen.queryByText('Emergency Incident 1')).not.toBeInTheDocument();
      });

      // Clear filters
      const clearButton = screen.getByText(/clear filters/i);
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
        expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
        expect(screen.getByText('Resolved Case')).toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // SORTING TESTS
  // =====================================================

  describe('Sorting Functionality', () => {
    it('should sort incidents by creation date (default)', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      const rows = screen.getAllByRole('row');
      const dataRows = rows.slice(1); // Remove header row

      // Verify default sorting (newest first)
      expect(within(dataRows[0]).getByText('Emergency Incident 1')).toBeInTheDocument();
      expect(within(dataRows[1]).getByText('Medium Priority Issue')).toBeInTheDocument();
      expect(within(dataRows[2]).getByText('Resolved Case')).toBeInTheDocument();
    });

    it('should sort incidents by priority when priority header is clicked', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Priority')).toBeInTheDocument();
      });

      // Click priority header to sort
      const priorityHeader = screen.getByText('Priority');
      fireEvent.click(priorityHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        const dataRows = rows.slice(1);

        // Verify sorting by priority (critical > medium > low)
        expect(within(dataRows[0]).getByText('critical')).toBeInTheDocument();
        expect(within(dataRows[1]).getByText('medium')).toBeInTheDocument();
        expect(within(dataRows[2]).getByText('low')).toBeInTheDocument();
      });
    });

    it('should reverse sort when header is clicked twice', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Priority')).toBeInTheDocument();
      });

      const priorityHeader = screen.getByText('Priority');
      
      // First click - ascending
      fireEvent.click(priorityHeader);
      
      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('critical')).toBeInTheDocument();
      });

      // Second click - descending
      fireEvent.click(priorityHeader);

      await waitFor(() => {
        const rows = screen.getAllByRole('row');
        expect(within(rows[1]).getByText('low')).toBeInTheDocument();
      });
    });

    it('should show sort indicators on headers', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Priority')).toBeInTheDocument();
      });

      const priorityHeader = screen.getByText('Priority');
      fireEvent.click(priorityHeader);

      await waitFor(() => {
        // Check for sort indicator (arrow, icon, etc.)
        expect(priorityHeader.closest('th')).toHaveClass(/sorted/);
      });
    });
  });

  // =====================================================
  // INTERACTION TESTS
  // =====================================================

  describe('User Interactions', () => {
    it('should open incident detail modal when row is clicked', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Click on incident row
      const incidentRow = screen.getByText('Emergency Incident 1').closest('tr');
      expect(incidentRow).toBeInTheDocument();
      
      fireEvent.click(incidentRow!);

      await waitFor(() => {
        // Check if modal opened (depends on implementation)
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should show action buttons for incidents based on user role', async () => {
      // Mock station admin user
      mockAuth.user.role = 'station_admin';

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Look for action buttons (assign, escalate, etc.)
      const assignButtons = screen.getAllByText(/assign/i);
      expect(assignButtons.length).toBeGreaterThan(0);
    });

    it('should handle assign incident action', async () => {
      mockAuth.user.role = 'station_admin';
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Find and click assign button
      const assignButton = screen.getAllByText(/assign/i)[0];
      fireEvent.click(assignButton);

      // Fill assignment form
      await waitFor(() => {
        const assigneeSelect = screen.getByLabelText(/assign to/i);
        fireEvent.change(assigneeSelect, { target: { value: 'staff-1' } });
      });

      const confirmButton = screen.getByText(/confirm/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/incidents/1/assign'),
          expect.any(Object)
        );
      });
    });

    it('should handle status update action', async () => {
      mockAuth.user.role = 'station_staff';
      mockApi.put.mockResolvedValue({ data: { success: true } });

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Medium Priority Issue')).toBeInTheDocument();
      });

      // Find and click status update button
      const updateButton = screen.getAllByText(/update status/i)[0];
      fireEvent.click(updateButton);

      // Update status
      await waitFor(() => {
        const statusSelect = screen.getByLabelText(/new status/i);
        fireEvent.change(statusSelect, { target: { value: 'in_progress' } });
      });

      const confirmButton = screen.getByText(/update/i);
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockApi.put).toHaveBeenCalledWith(
          expect.stringContaining('/api/incidents/2/status'),
          expect.any(Object)
        );
      });
    });
  });

  // =====================================================
  // ROLE-BASED DISPLAY TESTS
  // =====================================================

  describe('Role-based Display', () => {
    it('should show appropriate actions for station admin', async () => {
      mockAuth.user.role = 'station_admin';

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Station admins should see assign and reassign options
      expect(screen.getAllByText(/assign/i).length).toBeGreaterThan(0);
      
      // Should see escalate options
      const escalateButtons = screen.queryAllByText(/escalate/i);
      expect(escalateButtons.length).toBeGreaterThan(0);
    });

    it('should show appropriate actions for station staff', async () => {
      mockAuth.user.role = 'station_staff';

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Station staff should see limited actions
      const selfAssignButtons = screen.queryAllByText(/take case/i);
      const updateStatusButtons = screen.queryAllByText(/update status/i);
      
      // Should have some action buttons but limited compared to admin
      expect(selfAssignButtons.length + updateStatusButtons.length).toBeGreaterThan(0);
    });

    it('should show read-only view for citizens', async () => {
      mockAuth.user.role = 'citizen';

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Citizens should not see action buttons
      expect(screen.queryByText(/assign/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/escalate/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/update status/i)).not.toBeInTheDocument();
    });
  });

  // =====================================================
  // PAGINATION TESTS
  // =====================================================

  describe('Pagination', () => {
    it('should show pagination controls when there are many incidents', async () => {
      // Mock large dataset
      const manyIncidents = Array.from({ length: 25 }, (_, i) => ({
        ...mockIncidents[0],
        id: `incident-${i}`,
        title: `Incident ${i + 1}`
      }));

      mockApi.get.mockResolvedValue({ data: manyIncidents });

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Incident 1')).toBeInTheDocument();
      });

      // Check for pagination controls
      const pagination = screen.getByRole('navigation', { name: /pagination/i });
      expect(pagination).toBeInTheDocument();

      const nextButton = screen.getByText(/next/i);
      expect(nextButton).toBeInTheDocument();
    });

    it('should navigate between pages correctly', async () => {
      const manyIncidents = Array.from({ length: 25 }, (_, i) => ({
        ...mockIncidents[0],
        id: `incident-${i}`,
        title: `Incident ${i + 1}`
      }));

      mockApi.get.mockResolvedValue({ data: manyIncidents });

      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Incident 1')).toBeInTheDocument();
      });

      // Click next page
      const nextButton = screen.getByText(/next/i);
      fireEvent.click(nextButton);

      await waitFor(() => {
        // Should show next page items
        expect(screen.getByText('Incident 11')).toBeInTheDocument();
        expect(screen.queryByText('Incident 1')).not.toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // REAL-TIME UPDATES TESTS
  // =====================================================

  describe('Real-time Updates', () => {
    it('should update incident list when new incident is received via WebSocket', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Simulate WebSocket message for new incident
      const newIncident = {
        id: '4',
        title: 'New Real-time Incident',
        description: 'Just reported incident',
        type: 'police',
        priority: 'high',
        status: 'reported',
        location: { address: 'Real-time Location' },
        reportedById: 'citizen-4',
        reportedBy: { firstName: 'Real', lastName: 'Time' },
        stationId: 'test-station-id',
        organizationId: 'test-org-id',
        upvoteCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Mock the WebSocket update (this would typically come through context)
      // For testing, we'll simulate by updating the mock data
      mockApi.get.mockResolvedValue({ 
        data: [...mockIncidents, newIncident] 
      });

      // Trigger a refetch (in real app, this would be automatic via WebSocket)
      const refreshButton = screen.queryByText(/refresh/i);
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        expect(screen.getByText('New Real-time Incident')).toBeInTheDocument();
      });
    });

    it('should update incident status in real-time', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      // Simulate status update via WebSocket
      const updatedIncidents = mockIncidents.map(incident => 
        incident.id === '1' 
          ? { ...incident, status: 'in_progress' as const }
          : incident
      );

      mockApi.get.mockResolvedValue({ data: updatedIncidents });

      // Trigger update
      const refreshButton = screen.queryByText(/refresh/i);
      if (refreshButton) {
        fireEvent.click(refreshButton);
      }

      await waitFor(() => {
        expect(screen.getByText('in_progress')).toBeInTheDocument();
        expect(screen.queryByText('reported')).not.toBeInTheDocument();
      });
    });
  });

  // =====================================================
  // ACCESSIBILITY TESTS
  // =====================================================

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument();
      });

      // Check table structure
      expect(screen.getByRole('table')).toBeInTheDocument();
      
      const columnHeaders = screen.getAllByRole('columnheader');
      expect(columnHeaders.length).toBeGreaterThan(0);

      const rows = screen.getAllByRole('row');
      expect(rows.length).toBeGreaterThan(1); // Header + data rows
    });

    it('should be keyboard navigable', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('Emergency Incident 1')).toBeInTheDocument();
      });

      const firstRow = screen.getByText('Emergency Incident 1').closest('tr');
      
      // Should be focusable
      expect(firstRow).toHaveAttribute('tabIndex');
      
      // Test keyboard navigation
      fireEvent.keyDown(firstRow!, { key: 'Enter' });
      
      await waitFor(() => {
        // Should open modal or perform action
        expect(screen.queryByRole('dialog')).toBeInTheDocument();
      });
    });

    it('should have proper color contrast for status badges', async () => {
      render(
        <TestWrapper>
          <IncidentTable />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByText('critical')).toBeInTheDocument();
      });

      // Status badges should have appropriate contrast classes
      const criticalBadge = screen.getByText('critical');
      const reportedBadge = screen.getByText('reported');
      const resolvedBadge = screen.getByText('resolved');

      expect(criticalBadge).toHaveClass(/bg-/); // Should have background color class
      expect(reportedBadge).toHaveClass(/bg-/);
      expect(resolvedBadge).toHaveClass(/bg-/);
    });
  });
}); 