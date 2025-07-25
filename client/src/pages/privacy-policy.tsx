import React from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Info, Settings, Share, Lock, UserCircle, Clock, Baby, Globe, RefreshCw, Mail } from 'lucide-react';
import { useTranslation } from "react-i18next";

const privacySections = [
  {
    title: 'Information We Collect',
    icon: Info,
    color: 'bg-blue-500',
    content: `We collect information you provide directly to us, such as when you create an account, report an emergency, or contact us for support. This may include:

• Personal information (name, email, phone number)
• Location data when you report emergencies
• Emergency contact information
• Device information and app usage data
• Communications with our support team`,
  },
  {
    title: 'How We Use Your Information',
    icon: Settings,
    color: 'bg-purple-500',
    content: `We use the information we collect to:

• Provide emergency response services
• Process and respond to emergency reports
• Send important notifications and updates
• Improve our services and user experience
• Ensure the security and integrity of our platform
• Comply with legal obligations`,
  },
  {
    title: 'Information Sharing',
    icon: Share,
    color: 'bg-amber-500',
    content: `We may share your information in the following circumstances:

• With emergency responders and authorities when necessary
• With your consent or at your direction
• To comply with legal requirements or court orders
• To protect the safety and security of our users
• With service providers who assist in our operations

We do not sell, rent, or trade your personal information to third parties for marketing purposes.`,
  },
  {
    title: 'Data Security',
    icon: Lock,
    color: 'bg-red-500',
    content: `We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. These measures include:

• Encryption of data in transit and at rest
• Regular security assessments and updates
• Access controls and authentication measures
• Secure data storage and backup procedures`,
  },
  {
    title: 'Your Rights',
    icon: UserCircle,
    color: 'bg-green-500',
    content: `You have the following rights regarding your personal information:

• Access: Request a copy of your personal information
• Correction: Update or correct inaccurate information
• Deletion: Request deletion of your personal information
• Portability: Request transfer of your data
• Objection: Object to certain processing activities
• Withdrawal: Withdraw consent where applicable

To exercise these rights, please contact us using the information provided below.`,
  },
  {
    title: 'Data Retention',
    icon: Clock,
    color: 'bg-indigo-500',
    content: `We retain your personal information for as long as necessary to provide our services and fulfill the purposes outlined in this policy. The retention period may vary depending on:

• The type of information collected
• The purpose for which it was collected
• Legal and regulatory requirements
• Your continued use of our services

We will delete or anonymize your information when it is no longer needed.`,
  },
  {
    title: 'Children\'s Privacy',
    icon: Baby,
    color: 'bg-pink-500',
    content: `Our services are not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have collected information from a child under 13, please contact us immediately so we can take appropriate action.`,
  },
  {
    title: 'International Transfers',
    icon: Globe,
    color: 'bg-teal-500',
    content: `Your information may be transferred to and processed in countries other than your own. We ensure that such transfers comply with applicable data protection laws and implement appropriate safeguards to protect your information.`,
  },
  {
    title: 'Changes to This Policy',
    icon: RefreshCw,
    color: 'bg-orange-500',
    content: `We may update this Privacy Policy from time to time. We will notify you of any material changes by:

• Posting the updated policy in our app
• Sending you a notification
• Updating the "Last Updated" date

We encourage you to review this policy periodically to stay informed about how we protect your information.`,
  },
  {
    title: 'Contact Us',
    icon: Mail,
    color: 'bg-lime-500',
    content: `If you have any questions about this Privacy Policy or our privacy practices, please contact us:

Email: privacy@rindwa.rw
Phone: +250 788 123 456
Address: Kigali, Rwanda

We will respond to your inquiry within a reasonable timeframe.`,
  },
];

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-gray-600 dark:text-gray-400">Complete overview of how we collect, use, and protect your personal information</p>
      </div>
      
      <div className="flex justify-end mb-6">
        <Badge variant="outline" className="px-3 py-1 text-sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Last Updated: July 2024
        </Badge>
      </div>

      {/* Introduction Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Your Privacy Matters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Complete overview of how we collect, use, and protect your personal information when you use our emergency response platform.
          </p>
        </CardContent>
      </Card>

      {/* Privacy Sections */}
      <div className="space-y-6">
        {privacySections.map((section, index) => {
          const IconComponent = section.icon;
          return (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full ${section.color} flex items-center justify-center`}>
                    <IconComponent className="h-4 w-4 text-white" />
                  </div>
                  {section.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-gray-600 dark:text-gray-400">
                  {section.content}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Footer Card */}
      <Card className="mt-6 border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-4 w-4 text-blue-600" />
            Agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 italic">
            By using our application, you acknowledge that you have read and understood this Privacy Policy and agree to the collection, use, and disclosure of your information as described herein.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
} 