import React, { useState } from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  HelpCircle, 
  Search, 
  ChevronDown, 
  ChevronRight, 
  AlertTriangle, 
  User, 
  Smartphone, 
  Settings, 
  Mail, 
  Phone, 
  MessageCircle,
  FileText,
  BarChart
} from 'lucide-react';
import { useTranslation } from "react-i18next";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface SupportCategory {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
}

const supportCategories: SupportCategory[] = [
  {
    id: '1',
    title: 'Emergency Services',
    description: 'Get help with emergency response and reporting',
    icon: AlertTriangle,
    color: 'bg-red-500',
  },
  {
    id: '2',
    title: 'Account & Profile',
    description: 'Manage your account settings and profile',
    icon: User,
    color: 'bg-blue-500',
  },
  {
    id: '3',
    title: 'App Features',
    description: 'Learn how to use app features effectively',
    icon: Smartphone,
    color: 'bg-purple-500',
  },
  {
    id: '4',
    title: 'Technical Support',
    description: 'Report bugs and technical issues',
    icon: Settings,
    color: 'bg-green-500',
  },
];

const faqs: FAQItem[] = [
  {
    id: '1',
    question: 'How do I report an emergency?',
    answer: 'Navigate to the incidents page and click "Report Incident" or use the emergency button on the dashboard. Make sure to provide accurate location and incident details for faster response.',
    category: 'Emergency Services',
  },
  {
    id: '2',
    question: 'How can I update my profile information?',
    answer: 'Go to your Profile page from the sidebar menu, click "Edit Profile", and update your information. Don\'t forget to save your changes.',
    category: 'Account & Profile',
  },
  {
    id: '3',
    question: 'What should I do if the dashboard is not loading?',
    answer: 'Try refreshing the page first. If the problem persists, check your internet connection and ensure you\'re logged in. Contact technical support if issues continue.',
    category: 'Technical Support',
  },
  {
    id: '4',
    question: 'How do I change my password?',
    answer: 'Go to your Profile page, click on "Change Password" in the settings section. You will need to enter your current password and create a new one.',
    category: 'Account & Profile',
  },
  {
    id: '5',
    question: 'Can I assign incidents to other users?',
    answer: 'Yes, if you have the appropriate permissions (Station Admin or higher), you can assign incidents to staff members from the incident management interface.',
    category: 'Emergency Services',
  },
  {
    id: '6',
    question: 'How do I access analytics and reports?',
    answer: 'Navigate to the Analytics page from the sidebar menu. The available reports depend on your user role and organization permissions.',
    category: 'App Features',
  },
  {
    id: '7',
    question: 'What browsers are supported?',
    answer: 'The web application works best on modern browsers including Chrome, Firefox, Safari, and Edge. Make sure you\'re using the latest version for optimal performance.',
    category: 'Technical Support',
  },
  {
    id: '8',
    question: 'How do I invite new users to my organization?',
    answer: 'Go to the Users page, click "Invite User", enter their email address and select their role. They will receive an invitation email to join your organization.',
    category: 'Account & Profile',
  },
];

export default function HelpCenterPage() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  const filteredFAQs = faqs.filter(faq =>
    faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFAQ = (id: string) => {
    setExpandedFAQ(expandedFAQ === id ? null : id);
  };

  const handleContactSupport = () => {
    // Get contact information from environment or config
    const supportEmail = process.env.REACT_APP_SUPPORT_EMAIL || 'support@rindwa.rw';
    const supportPhone = process.env.REACT_APP_SUPPORT_PHONE || '+250 788 123 456';
    const responseTime = process.env.REACT_APP_SUPPORT_RESPONSE_TIME || '24 hours';
    
    alert(`Support contact information:\n\nEmail: ${supportEmail}\nPhone: ${supportPhone}\n\nWe typically respond within ${responseTime}.`);
  };

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Help Center</h1>
        <p className="text-gray-600 dark:text-gray-400">Find answers to common questions and get help with using the platform</p>
      </div>
      
      <div className="flex justify-end mb-6">
        <Badge variant="outline" className="px-3 py-1 text-sm">
          <BarChart className="h-4 w-4 mr-1" />
          {filteredFAQs.length} Help Articles
        </Badge>
      </div>

      {/* Search Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Search Help Articles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search for help articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Categories Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-amber-600" />
            Support Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {supportCategories.map(category => {
              const IconComponent = category.icon;
              return (
                <div
                  key={category.id}
                  className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow cursor-pointer"
                >
                  <div className={`w-12 h-12 rounded-full ${category.color} flex items-center justify-center mb-3`}>
                    <IconComponent className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">{category.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{category.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* FAQ Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-purple-600" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFAQs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">No help articles found</p>
              <p className="text-gray-500">Try adjusting your search terms</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredFAQs.map(faq => (
                <Collapsible key={faq.id} open={expandedFAQ === faq.id} onOpenChange={() => toggleFAQ(faq.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between p-4 h-auto">
                      <span className="text-left font-medium">{faq.question}</span>
                      {expandedFAQ === faq.id ? 
                        <ChevronDown className="h-4 w-4" /> : 
                        <ChevronRight className="h-4 w-4" />
                      }
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-4 pb-4">
                    <div className="pt-2 border-t">
                      <p className="text-gray-600 dark:text-gray-400 mb-2">{faq.answer}</p>
                      <Badge variant="secondary" className="text-xs">
                        {faq.category}
                      </Badge>
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Support Card */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-pink-600" />
            Still Need Help?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Can't find what you're looking for? Our support team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button onClick={handleContactSupport} className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Contact Support
            </Button>
            <Button variant="outline" className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              +250 788 123 456
            </Button>
          </div>
          <div className="mt-3 text-sm text-gray-500">
                            We typically respond within {process.env.REACT_APP_SUPPORT_RESPONSE_TIME || '24 hours'}
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
} 