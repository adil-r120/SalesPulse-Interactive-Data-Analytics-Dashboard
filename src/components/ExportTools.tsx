import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  Mail,
  Share2,
  Printer,
  Calendar,
  Database,
  Shield
} from 'lucide-react';
import { apiService } from '@/services/api';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

interface ExportToolsProps {
  data: Record<string, unknown>[];
  reportType?: string;
}

const ExportTools = ({ data, reportType = 'Sales Report' }: ExportToolsProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [userRole, setUserRole] = useState<string>('');
  const navigate = useNavigate();

  // Check user role on mount
  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const profile = await apiService.getProfile();
        setUserRole(profile.role || '');
      } catch (error) {
        console.error('Failed to fetch user profile:', error);
      }
    };
    fetchUserRole();
  }, []);

  const totalValue = data.reduce((acc, item) => {
    const val = Number(item.amount || item.total || item.price || item.revenue || 0);
    return acc + (isNaN(val) ? 0 : val);
  }, 0);

  const exportToCSV = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login first to export data.');
        setIsExporting(false);
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 5);

      const blob = await apiService.generateSalesReport({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        format: 'csv',
        include_charts: false
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('CSV exported successfully! 📄');
    } catch (error: unknown) {
      console.error('CSV generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast.error(`Failed to generate CSV: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToExcel = () => {
    setIsExporting(true);
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sales Data");
      XLSX.writeFile(wb, `${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel file exported successfully! 📊');
    } catch (error) {
      console.error("Excel export failed:", error);
      toast.error("Failed to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToPDF = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        alert('Please login first to export data.');
        setIsExporting(false);
        return;
      }

      const endDate = new Date();
      const startDate = new Date();
      startDate.setFullYear(endDate.getFullYear() - 5);

      const blob = await apiService.generateSalesReport({
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        format: 'pdf',
        include_charts: true
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${reportType}_${startDate.toISOString().split('T')[0]}_${endDate.toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error: unknown) {
      console.error('PDF generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`Failed to generate PDF: ${errorMessage}`);
    } finally {
      setIsExporting(false);
    }
  };

  const exportToImage = async () => {
    setIsExporting(true);

    try {
      const element = document.getElementById('printable-report-content');
      if (!element) {
        throw new Error("Report template element not found");
      }

      const canvas = await html2canvas(element, {
        useCORS: true,
        logging: false
      });

      const image = canvas.toDataURL("image/png");

      const link = document.createElement('a');
      link.href = image;
      link.download = `${reportType}_${new Date().toISOString().split('T')[0]}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Image export failed:", error);
      alert("Failed to export image.");
    } finally {
      setIsExporting(false);
    }
  };

  const shareReport = () => {
    if (navigator.share) {
      navigator.share({
        title: reportType,
        text: 'Check out this sales report from SalesPluse',
        url: window.location.href
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Report URL copied to clipboard!');
    }
  };

  const printReport = () => {
    window.print();
  };

  const scheduleReport = () => {
    alert('Schedule report feature coming soon!');
  };

  // Admin-only: Export feedback
  const exportFeedback = async () => {
    if (userRole !== 'Admin') {
      toast.error('This feature is only available to administrators.');
      return;
    }

    setIsExporting(true);
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('Please login first.');
        return;
      }

      const response = await fetch('http://localhost:8000/api/admin/feedback/export-csv', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to export feedback');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `feedback_export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Feedback exported successfully! 📊');
    } catch (error) {
      console.error('Feedback export failed:', error);
      toast.error('Failed to export feedback. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card className="bg-gradient-card border-border/50 shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export & Share</span>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={exportToCSV} disabled={isExporting} variant="outline" className="h-10 justify-start">
              <FileText className="h-4 w-4 mr-2" /> CSV
            </Button>
            <Button onClick={exportToExcel} disabled={isExporting} variant="outline" className="h-10 justify-start">
              <FileSpreadsheet className="h-4 w-4 mr-2" /> Excel
            </Button>
            <Button onClick={exportToPDF} disabled={isExporting} variant="outline" className="h-10 justify-start">
              <FileText className="h-4 w-4 mr-2" /> PDF
            </Button>
            <Button onClick={exportToImage} disabled={isExporting} variant="outline" className="h-10 justify-start">
              <FileImage className="h-4 w-4 mr-2" /> Image
            </Button>
          </div>

          <div className="pt-2 border-t">
            <div className="flex space-x-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Share2 className="h-4 w-4 mr-2" /> Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={shareReport}>
                    <Share2 className="h-4 w-4 mr-2" /> Share Link
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => alert('Email feature coming soon!')}>
                    <Mail className="h-4 w-4 mr-2" /> Email Report
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={printReport}>
                    <Printer className="h-4 w-4 mr-2" /> Print
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={scheduleReport}>
                    <Calendar className="h-4 w-4 mr-2" /> Schedule
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {isExporting && (
            <div className="text-center py-2">
              <div className="inline-flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                <span>Exporting...</span>
              </div>
            </div>
          )}

          <div className="text-xs text-muted-foreground text-center">
            Export {data.length} records in your preferred format
          </div>
        </CardContent>
      </Card>

      <div
        id="printable-report-content"
        style={{
          position: 'fixed',
          left: '-9999px',
          top: 0,
          width: '800px',
          minHeight: '1000px',
          backgroundColor: 'white',
          padding: '40px',
          color: '#1a1a1a',
          fontFamily: 'Arial, sans-serif',
          zIndex: -1000,
          boxSizing: 'border-box'
        }}
      >
        <div style={{ borderBottom: '2px solid #333', paddingBottom: '20px', marginBottom: '30px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '28px', margin: 0, color: '#1a1a1a', fontWeight: 'bold' }}>SalesPulse</h1>
              <p style={{ margin: '5px 0 0', color: '#666', fontSize: '14px' }}>Analytics & Business Intelligence</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <h2 style={{ fontSize: '20px', margin: 0, color: '#444' }}>{reportType}</h2>
              <p style={{ margin: '5px 0 0', color: '#888', fontSize: '12px' }}>
                Generated: {new Date().toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '30px',
          backgroundColor: '#f8f9fa',
          padding: '25px',
          borderRadius: '8px',
          border: '1px solid #e9ecef'
        }}>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total Records</p>
            <p style={{ margin: '10px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#2563eb' }}>{data.length}</p>
          </div>
          <div style={{ width: '1px', backgroundColor: '#dee2e6' }}></div>
          <div style={{ textAlign: 'center', flex: 1 }}>
            <p style={{ margin: 0, fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', color: '#666' }}>Total Revenue</p>
            <p style={{ margin: '10px 0 0', fontSize: '32px', fontWeight: 'bold', color: '#10b981' }}>
              {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(totalValue)}
            </p>
          </div>
        </div>

        <div style={{ marginBottom: '30px' }}>
          <h3 style={{ fontSize: '16px', borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '15px' }}>Data Details</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                {data.length > 0 && Object.keys(data[0]).map(key => (
                  <th key={key} style={{
                    padding: '12px',
                    textAlign: 'left',
                    borderBottom: '2px solid #ddd',
                    textTransform: 'capitalize',
                    color: '#4b5563',
                    fontWeight: '600'
                  }}>
                    {key.replace(/_/g, ' ')}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.slice(0, 50).map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                  {Object.values(row).map((val, j) => (
                    <td key={j} style={{ padding: '12px', color: '#374151' }}>
                      {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.length > 50 && (
            <p style={{ textAlign: 'center', color: '#888', marginTop: '15px', fontStyle: 'italic' }}>
              ... and {data.length - 50} more records (truncated for image preview)
            </p>
          )}
        </div>

        <div style={{
          marginTop: 'auto',
          textAlign: 'center',
          fontSize: '11px',
          color: '#9ca3af',
          borderTop: '1px solid #eee',
          paddingTop: '20px'
        }}>
          <p>© {new Date().getFullYear()} SalesPulse Analytics. Confidential & Proprietary.</p>
        </div>
      </div>
    </>
  );
};

export default ExportTools;