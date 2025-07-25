import React from 'react';
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Scale, CheckCircle, FileText, Users, AlertTriangle, Shield, Copyright, AlertCircle, XCircle, Gavel, RefreshCw, Mail } from 'lucide-react';
import { useTranslation } from "react-i18next";

const termsSections = [
  {
    title: 'Acceptance of Terms',
    icon: CheckCircle,
    color: 'bg-green-500',
    content: `By downloading, installing, or using the Rindwa Emergency Response application ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the App.

These Terms constitute a legally binding agreement between you and Rindwa Emergency Response regarding your use of the App and related services.`,
  },
  {
    title: 'Description of Service',
    icon: FileText,
    color: 'bg-blue-500',
    content: `The Rindwa Emergency Response App is an emergency response platform designed to:

• Enable users to report emergency incidents quickly and efficiently
• Provide real-time location tracking for emergency response
• Facilitate communication between users and emergency responders
• Offer emergency contact management and notification services
• Provide educational resources and safety information

The App is intended for use in emergency situations and should not be used for non-emergency purposes.`,
  },
  {
    title: 'User Responsibilities',
    icon: Users,
    color: 'bg-purple-500',
    content: `As a user of the App, you agree to:

• Use the App only for legitimate emergency situations
• Provide accurate and truthful information when reporting incidents
• Maintain the security of your account credentials
• Not misuse or abuse the emergency response system
• Comply with all applicable laws and regulations
• Respect the privacy and rights of other users
• Report any technical issues or security concerns promptly

You acknowledge that false emergency reports may result in legal consequences and account termination.`,
  },
  {
    title: 'Emergency Services',
    icon: AlertTriangle,
    color: 'bg-red-500',
    content: `The App facilitates communication with emergency services but does not guarantee:

• Response times or availability of emergency responders
• Accuracy of location data or incident information
• Availability of the App or its services at all times
• Compatibility with all devices or network conditions

Emergency response is subject to local emergency service availability and protocols. In life-threatening situations, always call your local emergency number directly.`,
  },
  {
    title: 'Privacy and Data',
    icon: Shield,
    color: 'bg-amber-500',
    content: `Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.

By using the App, you consent to:

• Collection of location data for emergency response purposes
• Sharing of information with emergency responders when necessary
• Processing of your data as described in our Privacy Policy
• Receiving emergency notifications and updates

You may withdraw consent for certain data processing activities, but this may limit App functionality.`,
  },
  {
    title: 'Intellectual Property',
    icon: Copyright,
    color: 'bg-indigo-500',
    content: `The App and its content, including but not limited to text, graphics, images, logos, and software, are owned by Rindwa Emergency Response and are protected by intellectual property laws.

You may not:

• Copy, modify, or distribute the App or its content
• Reverse engineer or attempt to extract source code
• Remove or alter copyright notices or trademarks
• Use the App for commercial purposes without authorization

All rights not expressly granted are reserved.`,
  },
  {
    title: 'Limitation of Liability',
    icon: AlertCircle,
    color: 'bg-pink-500',
    content: `To the maximum extent permitted by law, Rindwa Emergency Response shall not be liable for:

• Any direct, indirect, incidental, or consequential damages
• Loss of life, property, or data resulting from App use
• Delays or failures in emergency response services
• Technical issues or service interruptions
• Actions of third-party emergency responders

The App is provided "as is" without warranties of any kind, express or implied.`,
  },
  {
    title: 'Indemnification',
    icon: Scale,
    color: 'bg-teal-500',
    content: `You agree to indemnify and hold harmless Rindwa Emergency Response, its officers, directors, employees, and agents from any claims, damages, or expenses arising from:

• Your use of the App
• Violation of these Terms
• False or misleading information provided
• Misuse of emergency services
• Any actions that cause harm to others

This indemnification obligation survives termination of these Terms.`,
  },
  {
    title: 'Termination',
    icon: XCircle,
    color: 'bg-orange-500',
    content: `We may terminate or suspend your access to the App at any time, with or without cause, including for:

• Violation of these Terms
• Misuse of emergency services
• Fraudulent or illegal activities
• Extended periods of inactivity

Upon termination, your right to use the App ceases immediately. We may delete your account and data in accordance with our Privacy Policy.`,
  },
  {
    title: 'Governing Law',
    icon: Gavel,
    color: 'bg-lime-500',
    content: `These Terms are governed by the laws of Rwanda. Any disputes arising from these Terms or your use of the App shall be resolved in the courts of Rwanda.

If any provision of these Terms is found to be unenforceable, the remaining provisions shall remain in full force and effect.`,
  },
  {
    title: 'Changes to Terms',
    icon: RefreshCw,
    color: 'bg-cyan-500',
    content: `We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting in the App. Your continued use of the App after changes constitutes acceptance of the modified Terms.

We will notify you of material changes through the App or other reasonable means. It is your responsibility to review these Terms periodically.`,
  },
  {
    title: 'Contact Information',
    icon: Mail,
    color: 'bg-violet-500',
    content: `If you have questions about these Terms of Service, please contact us:

Email: legal@rindwa.rw
Phone: +250 788 123 456
Address: Kigali, Rwanda

We will respond to your inquiry within a reasonable timeframe.`,
  },
];

export default function TermsOfServicePage() {
  const { t } = useTranslation();

  return (
    <DashboardLayout title="Dashboard" subtitle="Welcome to Rindwa Admin">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Terms of Service</h1>
        <p className="text-gray-600 dark:text-gray-400">Legal terms and conditions governing your use of our emergency response platform</p>
      </div>
      
      <div className="flex justify-end mb-6">
        <Badge variant="outline" className="px-3 py-1 text-sm">
          <RefreshCw className="h-4 w-4 mr-1" />
          Last Updated: July 2025
        </Badge>
      </div>

      {/* Introduction Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-blue-600" />
            Terms of Service
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400">
            Please read these Terms of Service carefully before using the Rindwa Emergency Response application. These terms govern your use of our emergency response platform.
          </p>
        </CardContent>
      </Card>

      {/* Terms Sections */}
      <div className="space-y-6">
        {termsSections.map((section, index) => {
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
            <AlertTriangle className="h-4 w-4 text-blue-600" />
            Legal Agreement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 dark:text-gray-400 italic">
            By using our application, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
          </p>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
} 