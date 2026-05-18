'use client';

import { useState, useEffect, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { getSettings, updateSettings, StoreSettingsData } from '@/app/actions/settings';
import { getPages, updatePage, ContentPageData, seedCMSPages } from '@/app/actions/cms';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Modal } from '@/components/ui/Modal';
import { toast } from 'sonner';
import { Edit, Plus, Upload, X, HelpCircle, Trash2, Eye, EyeOff } from 'lucide-react';
import { CldUploadWidget } from 'next-cloudinary';
import FaqTable from '@/components/admin/FaqTable';
import { Dialog } from '@/components/ui/Dialog';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD'];

const COUNTRIES = [
  { value: "AF", label: "🇦🇫 Afghanistan" },
  { value: "AL", label: "🇦🇱 Albania" },
  { value: "DZ", label: "🇩🇿 Algeria" },
  { value: "AS", label: "🇦🇸 American Samoa" },
  { value: "AD", label: "🇦🇩 Andorra" },
  { value: "AO", label: "🇦🇴 Angola" },
  { value: "AI", label: "🇦🇮 Anguilla" },
  { value: "AQ", label: "🇦🇶 Antarctica" },
  { value: "AG", label: "🇦🇬 Antigua and Barbuda" },
  { value: "AR", label: "🇦🇷 Argentina" },
  { value: "AM", label: "🇦🇲 Armenia" },
  { value: "AW", label: "🇦🇼 Aruba" },
  { value: "AU", label: "🇦🇺 Australia" },
  { value: "AT", label: "🇦🇹 Austria" },
  { value: "AZ", label: "🇦🇿 Azerbaijan" },
  { value: "BS", label: "🇧🇸 Bahamas" },
  { value: "BH", label: "🇧🇭 Bahrain" },
  { value: "BD", label: "🇧🇩 Bangladesh" },
  { value: "BB", label: "🇧🇧 Barbados" },
  { value: "BY", label: "🇧🇾 Belarus" },
  { value: "BE", label: "🇧🇪 Belgium" },
  { value: "BZ", label: "🇧🇿 Belize" },
  { value: "BJ", label: "🇧🇯 Benin" },
  { value: "BM", label: "🇧🇲 Bermuda" },
  { value: "BT", label: "🇧🇹 Bhutan" },
  { value: "BO", label: "🇧🇴 Bolivia" },
  { value: "BA", label: "🇧🇦 Bosnia and Herzegovina" },
  { value: "BW", label: "🇧🇼 Botswana" },
  { value: "BR", label: "🇧🇷 Brazil" },
  { value: "IO", label: "🇮🇴 British Indian Ocean Territory" },
  { value: "VG", label: "🇻🇬 British Virgin Islands" },
  { value: "BN", label: "🇧🇳 Brunei" },
  { value: "BG", label: "🇧🇬 Bulgaria" },
  { value: "BF", label: "🇧🇫 Burkina Faso" },
  { value: "BI", label: "🇧🇮 Burundi" },
  { value: "KH", label: "🇰🇭 Cambodia" },
  { value: "CM", label: "🇨🇲 Cameroon" },
  { value: "CA", label: "🇨🇦 Canada" },
  { value: "CV", label: "🇨🇻 Cape Verde" },
  { value: "KY", label: "🇰🇾 Cayman Islands" },
  { value: "CF", label: "🇨🇫 Central African Republic" },
  { value: "TD", label: "🇹🇩 Chad" },
  { value: "CL", label: "🇨🇱 Chile" },
  { value: "CN", label: "🇨🇳 China" },
  { value: "CX", label: "🇨🇽 Christmas Island" },
  { value: "CC", label: "🇨🇨 Cocos Islands" },
  { value: "CO", label: "🇨🇴 Colombia" },
  { value: "KM", label: "🇰🇲 Comoros" },
  { value: "CK", label: "🇨🇰 Cook Islands" },
  { value: "CR", label: "🇨🇷 Costa Rica" },
  { value: "HR", label: "🇭🇷 Croatia" },
  { value: "CU", label: "🇨🇺 Cuba" },
  { value: "CW", label: "🇨🇼 Curacao" },
  { value: "CY", label: "🇨🇾 Cyprus" },
  { value: "CZ", label: "🇨🇿 Czech Republic" },
  { value: "CD", label: "🇨🇩 Democratic Republic of the Congo" },
  { value: "DK", label: "🇩🇰 Denmark" },
  { value: "DJ", label: "🇩🇯 Djibouti" },
  { value: "DM", label: "🇩🇲 Dominica" },
  { value: "DO", label: "🇩🇴 Dominican Republic" },
  { value: "TL", label: "🇹🇱 East Timor" },
  { value: "EC", label: "🇪🇨 Ecuador" },
  { value: "EG", label: "🇪🇬 Egypt" },
  { value: "SV", label: "🇸🇻 El Salvador" },
  { value: "GQ", label: "🇬🇶 Equatorial Guinea" },
  { value: "ER", label: "🇪🇷 Eritrea" },
  { value: "EE", label: "🇪🇪 Estonia" },
  { value: "ET", label: "🇪🇹 Ethiopia" },
  { value: "FK", label: "🇫🇰 Falkland Islands" },
  { value: "FO", label: "🇫🇴 Faroe Islands" },
  { value: "FJ", label: "🇫🇯 Fiji" },
  { value: "FI", label: "🇫🇮 Finland" },
  { value: "FR", label: "🇫🇷 France" },
  { value: "PF", label: "🇵🇫 French Polynesia" },
  { value: "GA", label: "🇬🇦 Gabon" },
  { value: "GM", label: "🇬🇲 Gambia" },
  { value: "GE", label: "🇬🇪 Georgia" },
  { value: "DE", label: "🇩🇪 Germany" },
  { value: "GH", label: "🇬🇭 Ghana" },
  { value: "GI", label: "🇬🇮 Gibraltar" },
  { value: "GR", label: "🇬🇷 Greece" },
  { value: "GL", label: "🇬🇱 Greenland" },
  { value: "GD", label: "🇬🇩 Grenada" },
  { value: "GU", label: "🇬🇺 Guam" },
  { value: "GT", label: "🇬🇹 Guatemala" },
  { value: "GG", label: "🇬🇬 Guernsey" },
  { value: "GN", label: "🇬🇳 Guinea" },
  { value: "GW", label: "🇬🇼 Guinea-Bissau" },
  { value: "GY", label: "🇬🇾 Guyana" },
  { value: "HT", label: "🇭🇹 Haiti" },
  { value: "HN", label: "🇭🇳 Honduras" },
  { value: "HK", label: "🇭🇰 Hong Kong" },
  { value: "HU", label: "🇭🇺 Hungary" },
  { value: "IS", label: "🇮🇸 Iceland" },
  { value: "IN", label: "🇮🇳 India" },
  { value: "ID", label: "🇮🇩 Indonesia" },
  { value: "IR", label: "🇮🇷 Iran" },
  { value: "IQ", label: "🇮🇶 Iraq" },
  { value: "IE", label: "🇮🇪 Ireland" },
  { value: "IM", label: "🇮🇲 Isle of Man" },
  { value: "IL", label: "🇮🇱 Israel" },
  { value: "IT", label: "🇮🇹 Italy" },
  { value: "CI", label: "🇨🇮 Ivory Coast" },
  { value: "JM", label: "🇯🇲 Jamaica" },
  { value: "JP", label: "🇯🇵 Japan" },
  { value: "JE", label: "🇯🇪 Jersey" },
  { value: "JO", label: "🇯🇴 Jordan" },
  { value: "KZ", label: "🇰🇿 Kazakhstan" },
  { value: "KE", label: "🇰🇪 Kenya" },
  { value: "KI", label: "🇰🇮 Kiribati" },
  { value: "XK", label: "🇽🇰 Kosovo" },
  { value: "KW", label: "🇰🇼 Kuwait" },
  { value: "KG", label: "🇰🇬 Kyrgyzstan" },
  { value: "LA", label: "🇱🇦 Laos" },
  { value: "LV", label: "🇱🇻 Latvia" },
  { value: "LB", label: "🇱🇧 Lebanon" },
  { value: "LS", label: "🇱🇸 Lesotho" },
  { value: "LR", label: "🇱🇷 Liberia" },
  { value: "LY", label: "🇱🇾 Libya" },
  { value: "LI", label: "🇱🇮 Liechtenstein" },
  { value: "LT", label: "🇱🇹 Lithuania" },
  { value: "LU", label: "🇱🇺 Luxembourg" },
  { value: "MO", label: "🇲🇴 Macau" },
  { value: "MK", label: "🇲🇰 Macedonia" },
  { value: "MG", label: "🇲🇬 Madagascar" },
  { value: "MW", label: "🇲🇼 Malawi" },
  { value: "MY", label: "🇲🇾 Malaysia" },
  { value: "MV", label: "🇲🇻 Maldives" },
  { value: "ML", label: "🇲🇱 Mali" },
  { value: "MT", label: "🇲🇹 Malta" },
  { value: "MH", label: "🇲🇭 Marshall Islands" },
  { value: "MR", label: "🇲🇷 Mauritania" },
  { value: "MU", label: "🇲🇺 Mauritius" },
  { value: "YT", label: "🇾🇹 Mayotte" },
  { value: "MX", label: "🇲🇽 Mexico" },
  { value: "FM", label: "🇫🇲 Micronesia" },
  { value: "MD", label: "🇲🇩 Moldova" },
  { value: "MC", label: "🇲🇨 Monaco" },
  { value: "MN", label: "🇲🇳 Mongolia" },
  { value: "ME", label: "🇲🇪 Montenegro" },
  { value: "MS", label: "🇲🇸 Montserrat" },
  { value: "MA", label: "🇲🇦 Morocco" },
  { value: "MZ", label: "🇲🇿 Mozambique" },
  { value: "MM", label: "🇲🇲 Myanmar" },
  { value: "NA", label: "🇳🇦 Namibia" },
  { value: "NR", label: "🇳🇷 Nauru" },
  { value: "NP", label: "🇳🇵 Nepal" },
  { value: "NL", label: "🇳🇱 Netherlands" },
  { value: "AN", label: "🇦🇳 Netherlands Antilles" },
  { value: "NC", label: "🇳🇨 New Caledonia" },
  { value: "NZ", label: "🇳🇿 New Zealand" },
  { value: "NI", label: "🇳🇮 Nicaragua" },
  { value: "NE", label: "🇳🇪 Niger" },
  { value: "NG", label: "🇳🇬 Nigeria" },
  { value: "NU", label: "🇳🇺 Niue" },
  { value: "KP", label: "🇰🇵 North Korea" },
  { value: "MP", label: "🇲🇵 Northern Mariana Islands" },
  { value: "NO", label: "🇳🇴 Norway" },
  { value: "OM", label: "🇴🇲 Oman" },
  { value: "PK", label: "🇵🇰 Pakistan" },
  { value: "PW", label: "🇵🇼 Palau" },
  { value: "PS", label: "🇵🇸 Palestine" },
  { value: "PA", label: "🇵🇦 Panama" },
  { value: "PG", label: "🇵🇬 Papua New Guinea" },
  { value: "PY", label: "🇵🇾 Paraguay" },
  { value: "PE", label: "🇵🇪 Peru" },
  { value: "PH", label: "🇵🇭 Philippines" },
  { value: "PN", label: "🇵🇳 Pitcairn" },
  { value: "PL", label: "🇵🇱 Poland" },
  { value: "PT", label: "🇵🇹 Portugal" },
  { value: "PR", label: "🇵🇷 Puerto Rico" },
  { value: "QA", label: "🇶🇦 Qatar" },
  { value: "CG", label: "🇨🇬 Republic of the Congo" },
  { value: "RE", label: "🇷🇪 Reunion" },
  { value: "RO", label: "🇷🇴 Romania" },
  { value: "RU", label: "🇷🇺 Russia" },
  { value: "RW", label: "🇷🇼 Rwanda" },
  { value: "BL", label: "🇧🇱 Saint Barthelemy" },
  { value: "SH", label: "🇸🇭 Saint Helena" },
  { value: "KN", label: "🇰🇳 Saint Kitts and Nevis" },
  { value: "LC", label: "🇱🇨 Saint Lucia" },
  { value: "MF", label: "🇲🇫 Saint Martin" },
  { value: "PM", label: "🇵🇲 Saint Pierre and Miquelon" },
  { value: "VC", label: "🇻🇨 Saint Vincent and the Grenadines" },
  { value: "WS", label: "🇼🇸 Samoa" },
  { value: "SM", label: "🇸🇲 San Marino" },
  { value: "ST", label: "🇸🇹 Sao Tome and Principe" },
  { value: "SA", label: "🇸🇦 Saudi Arabia" },
  { value: "SN", label: "🇸🇳 Senegal" },
  { value: "RS", label: "🇷🇸 Serbia" },
  { value: "SC", label: "🇸🇨 Seychelles" },
  { value: "SL", label: "🇸🇱 Sierra Leone" },
  { value: "SG", label: "🇸🇬 Singapore" },
  { value: "SX", label: "🇸🇽 Sint Maarten" },
  { value: "SK", label: "🇸🇰 Slovakia" },
  { value: "SI", label: "🇸🇮 Slovenia" },
  { value: "SB", label: "🇸🇧 Solomon Islands" },
  { value: "SO", label: "🇸🇴 Somalia" },
  { value: "ZA", label: "🇿🇦 South Africa" },
  { value: "KR", label: "🇰🇷 South Korea" },
  { value: "SS", label: "🇸🇸 South Sudan" },
  { value: "ES", label: "🇪🇸 Spain" },
  { value: "LK", label: "🇱🇰 Sri Lanka" },
  { value: "SD", label: "🇸🇩 Sudan" },
  { value: "SR", label: "🇸🇷 Suriname" },
  { value: "SJ", label: "🇸🇯 Svalbard and Jan Mayen" },
  { value: "SZ", label: "🇸🇿 Swaziland" },
  { value: "SE", label: "🇸🇪 Sweden" },
  { value: "CH", label: "🇨🇭 Switzerland" },
  { value: "SY", label: "🇸🇾 Syria" },
  { value: "TW", label: "🇹🇼 Taiwan" },
  { value: "TJ", label: "🇹🇯 Tajikistan" },
  { value: "TZ", label: "🇹🇿 Tanzania" },
  { value: "TH", label: "🇹🇭 Thailand" },
  { value: "TG", label: "🇹🇬 Togo" },
  { value: "TK", label: "🇹🇰 Tokelau" },
  { value: "TO", label: "🇹🇴 Tonga" },
  { value: "TT", label: "🇹🇹 Trinidad and Tobago" },
  { value: "TN", label: "🇹🇳 Tunisia" },
  { value: "TR", label: "🇹🇷 Turkey" },
  { value: "TM", label: "🇹🇲 Turkmenistan" },
  { value: "TC", label: "🇹🇨 Turks and Caicos Islands" },
  { value: "TV", label: "🇹🇻 Tuvalu" },
  { value: "VI", label: "🇻🇮 U.S. Virgin Islands" },
  { value: "UG", label: "🇺🇬 Uganda" },
  { value: "UA", label: "🇺🇦 Ukraine" },
  { value: "AE", label: "🇦🇪 United Arab Emirates" },
  { value: "GB", label: "🇬🇧 United Kingdom" },
  { value: "US", label: "🇺🇸 United States" },
  { value: "UY", label: "🇺🇾 Uruguay" },
  { value: "UZ", label: "🇺🇿 Uzbekistan" },
  { value: "VU", label: "🇻🇺 Vanuatu" },
  { value: "VA", label: "🇻🇦 Vatican" },
  { value: "VE", label: "🇻🇪 Venezuela" },
  { value: "VN", label: "🇻🇳 Vietnam" },
  { value: "WF", label: "🇼🇫 Wallis and Futuna" },
  { value: "EH", label: "🇪🇭 Western Sahara" },
  { value: "YE", label: "🇾🇪 Yemen" },
  { value: "ZM", label: "🇿🇲 Zambia" },
  { value: "ZW", label: "🇿🇼 Zimbabwe" }
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'branding' | 'cms'>('general');
  const [settings, setSettings] = useState<StoreSettingsData | null>(null);
  const [pages, setPages] = useState<any[]>([]);
  const [faqItems, setFaqItems] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMapHelpModalOpen, setIsMapHelpModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState<any | null>(null);
  const [isFaqFormOpen, setIsFaqFormOpen] = useState(false);
  const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
  const [isFaqDeleteDialogOpen, setIsFaqDeleteDialogOpen] = useState(false);
  const [faqToDeleteId, setFaqToDeleteId] = useState<string | null>(null);

  const [faqFormData, setFaqFormData] = useState({
    question: "",
    answer: "",
    category: "General",
    sortOrder: 0,
    isVisible: true,
  });

  const { register, handleSubmit, setValue, watch, reset } = useForm<StoreSettingsData>();
  const cmsForm = useForm<ContentPageData>();

  const loadSettings = async () => {
    const res = await getSettings();
    if (res.success && res.data) {
      const data = res.data as unknown as StoreSettingsData;
      setSettings(data);
      setValue('companyName', data.companyName || '');
      setValue('storeEmail', data.storeEmail || '');
      setValue('currency', data.currency);
      setValue('taxRate', data.taxRate);
      setValue('baseCity', data.baseCity || '');
      setValue('taxiLicense', data.taxiLicense || '');
      setValue('tiktokUrl', data.tiktokUrl || '');
      setValue('facebookUrl', data.facebookUrl || '');
      setValue('instagramUrl', data.instagramUrl || '');
      setValue('heroTitle', data.heroTitle || '');
      setValue('heroSubtitle', data.heroSubtitle || '');
      setValue('heroButtonText', data.heroButtonText || '');
      setValue('heroImageUrl', data.heroImageUrl || '');
      setValue('ctaTitle', data.ctaTitle || '');
      setValue('ctaSubtitle', data.ctaSubtitle || '');
      setValue('ctaButtonText', data.ctaButtonText || '');
      setValue('footerCopyright', data.footerCopyright || '');
      setValue('faviconUrl', data.faviconUrl || '');
      setValue('ogImageUrl', data.ogImageUrl || '');
      setValue('siteLang', data.siteLang || 'en');
      setValue('phoneNumber', data.phoneNumber || '');
      setValue('whatsappNumber', data.whatsappNumber || '');
      setValue('workingHours', data.workingHours || '');
      setValue('serviceArea', data.serviceArea || '');
      setValue('fleetSize', data.fleetSize || 0);
      setValue('logoUrl', data.logoUrl || '');
      setValue('mapCountryCode', data.mapCountryCode || 'GB');
      setValue('mapDefaultZoom', data.mapDefaultZoom || 12);
      setValue('mapCenterLat', data.mapCenterLat || 51.5074);
      setValue('mapCenterLng', data.mapCenterLng || -0.1278);
      setValue('enableCardPayment', data.enableCardPayment ?? true);
      setValue('enableCashPayment', data.enableCashPayment ?? true);
      setValue('familyTitle', data.familyTitle || '');
      setValue('familyText', data.familyText || '');
      setValue('statsBar1Value', data.statsBar1Value || '');
      setValue('statsBar1Label', data.statsBar1Label || '');
      setValue('statsBar2Value', data.statsBar2Value || '');
      setValue('statsBar2Label', data.statsBar2Label || '');
      setValue('statsBar3Value', data.statsBar3Value || '');
      setValue('statsBar3Label', data.statsBar3Label || '');
      setValue('statsBar4Value', data.statsBar4Value || '');
      setValue('statsBar4Label', data.statsBar4Label || '');
      setValue('servicesTitle', data.servicesTitle || '');
      setValue('servicesSubtitle', data.servicesSubtitle || '');
      setValue('service1Title', data.service1Title || '');
      setValue('service1Text', data.service1Text || '');
      setValue('service2Title', data.service2Title || '');
      setValue('service2Text', data.service2Text || '');
      setValue('service3Title', data.service3Title || '');
      setValue('service3Text', data.service3Text || '');
      setValue('featuresTitle', data.featuresTitle || '');
      setValue('featuresSubtitle', data.featuresSubtitle || '');
      setValue('feature1Title', data.feature1Title || '');
      setValue('feature1Text', data.feature1Text || '');
      setValue('feature2Title', data.feature2Title || '');
      setValue('feature2Text', data.feature2Text || '');
      setValue('feature3Title', data.feature3Title || '');
      setValue('feature3Text', data.feature3Text || '');
      setValue('feature4Title', data.feature4Title || '');
      setValue('feature4Text', data.feature4Text || '');
      setValue('airportSurcharge', data.airportSurcharge ?? 5);
      setValue('luggageFee', data.luggageFee ?? 5);
      setValue('childSeatFee', data.childSeatFee ?? 5);
    }
  };

  const loadPages = async () => {
    const res = await getPages();
    if (res.success && res.data) {
      setPages(res.data);
    }
  };

  const loadFaqs = async () => {
    try {
      const res = await fetch('/api/faq');
      const data = await res.json();
      if (Array.isArray(data)) {
        setFaqItems(data);
      }
    } catch (error) {
      console.error("Failed to fetch FAQs:", error);
    }
  };

  useEffect(() => {
    loadSettings();
    loadPages();
    loadFaqs();
  }, [setValue]);


  const onSettingsSubmit = (data: StoreSettingsData) => {
    startTransition(async () => {
      const res = await updateSettings({
        ...data,
        taxRate: Number(data.taxRate),
        fleetSize: Number(data.fleetSize),
        mapDefaultZoom: Number(data.mapDefaultZoom),
        mapCenterLat: Number(data.mapCenterLat),
        mapCenterLng: Number(data.mapCenterLng),
        airportSurcharge: Number(data.airportSurcharge ?? 5),
        luggageFee: Number(data.luggageFee ?? 5),
        childSeatFee: Number(data.childSeatFee ?? 5),
        statsBar1Value: data.statsBar1Value,
        statsBar1Label: data.statsBar1Label,
        statsBar2Value: data.statsBar2Value,
        statsBar2Label: data.statsBar2Label,
        statsBar3Value: data.statsBar3Value,
        statsBar3Label: data.statsBar3Label,
        statsBar4Value: data.statsBar4Value,
        statsBar4Label: data.statsBar4Label,
        servicesTitle: data.servicesTitle,
        servicesSubtitle: data.servicesSubtitle,
        service1Title: data.service1Title,
        service1Text: data.service1Text,
        service2Title: data.service2Title,
        service2Text: data.service2Text,
        service3Title: data.service3Title,
        service3Text: data.service3Text,
      });
      if (res.success) {
        toast.success('Settings updated successfully');
        loadSettings();
      } else {
        toast.error('Failed to update settings');
      }
    });
  };

  const onPageSubmit = (data: ContentPageData) => {
    startTransition(async () => {
      if (!editingPage) return;

      const res = await updatePage(editingPage.id, data);

      if (res.success) {
        toast.success('Page updated');
        setIsModalOpen(false);
        setEditingPage(null);
        cmsForm.reset();
        loadPages();
      } else {
        toast.error('Failed to save page');
      }
    });
  };

  const onFaqSubmit = async () => {
    if (!faqFormData.question || !faqFormData.answer) {
      toast.error('Please fill in Question and Answer');
      return;
    }

    startTransition(async () => {
      try {
        const url = editingFaqId ? `/api/faq/${editingFaqId}` : "/api/faq";
        const method = editingFaqId ? "PATCH" : "POST";

        const response = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(faqFormData),
        });

        if (response.ok) {
          toast.success(editingFaqId ? 'FAQ updated' : 'FAQ created');
          await loadFaqs();
          setIsFaqFormOpen(false);
          resetFaqForm();
        } else {
          toast.error('Failed to save FAQ');
        }
      } catch (error) {
        console.error("Failed to save FAQ:", error);
        toast.error('An error occurred while saving FAQ');
      }
    });
  };

  const handleToggleFaqVisibility = async (item: any) => {
    try {
      const response = await fetch(`/api/faq/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: !item.isVisible }),
      });
      if (response.ok) {
        loadFaqs();
      }
    } catch (error) {
      console.error("Failed to toggle FAQ visibility:", error);
    }
  };

  const handleEditFaq = (item: any) => {
    setEditingFaqId(item.id);
    setFaqFormData({
      question: item.question,
      answer: item.answer,
      category: item.category || "General",
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
    setIsFaqFormOpen(true);
  };

  const onFaqDelete = async () => {
    if (!faqToDeleteId) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/faq/${faqToDeleteId}`, {
          method: "DELETE",
        });
        if (response.ok) {
          toast.success('FAQ deleted');
          await loadFaqs();
          setIsFaqDeleteDialogOpen(false);
          setFaqToDeleteId(null);
        } else {
          toast.error('Failed to delete FAQ');
        }
      } catch (error) {
        console.error("Failed to delete FAQ:", error);
        toast.error('An error occurred while deleting FAQ');
      }
    });
  };

  const resetFaqForm = () => {
    setFaqFormData({
      question: "",
      answer: "",
      category: "General",
      sortOrder: 0,
      isVisible: true,
    });
    setEditingFaqId(null);
  };

  const handleEditPage = (page: any) => {
    setEditingPage(page);
    cmsForm.setValue('slug', page.slug);
    cmsForm.setValue('title', page.title);
    cmsForm.setValue('content', page.content);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 bg-taxi-gold-gradient-left bg-clip-text text-transparent">Admin Settings</h1>

      <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
        ← Scroll left/right to see all →
      </p>

      <div className="flex overflow-x-auto pb-2 mb-8 border-b border-white/10 scrollbar-hide -mx-2 px-2 sm:mx-0 sm:px-0 sm:space-x-4">
        <button
          className={`pb-2 px-4 whitespace-nowrap transition-colors ${activeTab === 'general'
            ? 'border-b-2 border-taxi-gold font-semibold text-taxi-gold'
            : 'text-gray-500 hover:text-gray-300'
            }`}
          onClick={() => setActiveTab('general')}
        >
          General Settings
        </button>
        <button
          className={`pb-2 px-4 whitespace-nowrap transition-colors ${activeTab === 'branding'
            ? 'border-b-2 border-taxi-gold font-semibold text-taxi-gold'
            : 'text-gray-500 hover:text-gray-300'
            }`}
          onClick={() => setActiveTab('branding')}
        >
          Branding & Content
        </button>
        <button
          className={`pb-2 px-4 whitespace-nowrap transition-colors ${activeTab === 'cms'
            ? 'border-b-2 border-taxi-gold font-semibold text-taxi-gold'
            : 'text-gray-500 hover:text-gray-300'
            }`}
          onClick={() => setActiveTab('cms')}
        >
          Content Management
        </button>
      </div>

      {activeTab === 'branding' && (
        <form onSubmit={handleSubmit(onSettingsSubmit)} className="space-y-6 bg-white/5 p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md">

          {/* Hero Section */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🖼️ Site Assets
              <span className="text-xs font-normal text-gray-400">(Logo, Favicon and OG Image)</span>
            </h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Site Logo</label>
                <div className="flex items-center gap-4 mb-2">
                  {watch('logoUrl') && (
                    <div className="relative w-20 h-20 rounded-lg overflow-hidden bg-white/10 border border-white/10">
                      <img
                        src={watch('logoUrl')}
                        alt="Logo Preview"
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setValue('logoUrl', '')}
                        className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-3">
                      <Input
                        {...register('logoUrl')}
                        placeholder="https://res.cloudinary.com/..."
                        className="flex-1"
                      />
                      <CldUploadWidget
                        uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                        onSuccess={(result: any) => {
                          if (result.info?.secure_url) {
                            setValue('logoUrl', result.info.secure_url);
                          }
                        }}
                      >
                        {(widget) => (
                          <Button
                            type="button"
                            onClick={() => widget?.open?.()}
                            variant="ghost"
                            className="gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 transition-all shadow-lg shadow-black/20"
                          >
                            <Upload className="w-4 h-4" />
                            Upload
                          </Button>
                        )}
                      </CldUploadWidget>
                    </div>
                    <p className="text-xs text-gray-500">Recommended: Transparent PNG, max height 60px</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Favicon URL</label>
                <div className="flex gap-3">
                  <Input
                    {...register('faviconUrl')}
                    placeholder="https://i.imgur.com/..."
                    className="flex-1"
                  />
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                    onSuccess={(result: any) => {
                      if (result.info?.secure_url) {
                        setValue('faviconUrl', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <Button
                        type="button"
                        onClick={() => open()}
                        variant="ghost"
                        className="gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 transition-all shadow-lg shadow-black/20"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    )}
                  </CldUploadWidget>
                </div>
                <p className="text-xs text-gray-500">Recommended: 32x32 or 64x64 PNG/ICO</p>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Open Graph Image (OG Image)</label>
                <div className="flex gap-3">
                  <Input
                    {...register('ogImageUrl')}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1"
                  />
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                    onSuccess={(result: any) => {
                      if (result.info?.secure_url) {
                        setValue('ogImageUrl', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <Button
                        type="button"
                        onClick={() => open()}
                        variant="ghost"
                        className="gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 transition-all shadow-lg shadow-black/20"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    )}
                  </CldUploadWidget>
                </div>
                <p className="text-xs text-gray-500">Recommended: 1200x630 PNG/JPG for social sharing</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🏠 Hero Section
              <span className="text-xs font-normal text-gray-400">(Main banner on homepage)</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Headline</label>
                <Input {...register('heroTitle')} placeholder="Fast and Reliable Taxi Service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Subheadline</label>
                <Input {...register('heroSubtitle')} placeholder="Book your ride in seconds" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Button Text</label>
                <Input {...register('heroButtonText')} placeholder="Book Now" />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-white/90">Hero Background Image URL (Cloudinary)</label>
                <div className="flex gap-3">
                  <Input
                    {...register('heroImageUrl')}
                    placeholder="https://res.cloudinary.com/..."
                    className="flex-1"
                  />
                  <CldUploadWidget
                    uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                    onSuccess={(result: any) => {
                      if (result.info?.secure_url) {
                        setValue('heroImageUrl', result.info.secure_url);
                      }
                    }}
                  >
                    {({ open }) => (
                      <Button
                        type="button"
                        onClick={() => open()}
                        variant="ghost"
                        className="gap-2 bg-white/10 border border-white/10 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/30 transition-all shadow-lg shadow-black/20"
                      >
                        <Upload className="w-4 h-4" />
                        Upload
                      </Button>
                    )}
                  </CldUploadWidget>
                </div>
                <p className="text-xs text-gray-500">Recommended: 1920x1080 JPG/WebP</p>
              </div>
            </div>

            <h4 className="text-md font-semibold text-white/80 mb-4 mt-8 pt-8 border-t border-white/5">
              📊 Stats Bar (below Hero)
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 1 Value</label>
                <Input {...register('statsBar1Value')} placeholder="1,200+" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 1 Label</label>
                <Input {...register('statsBar1Label')} placeholder="Trips Completed" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 2 Value</label>
                <Input {...register('statsBar2Value')} placeholder="950+" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 2 Label</label>
                <Input {...register('statsBar2Label')} placeholder="Happy Clients" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 3 Value</label>
                <Input {...register('statsBar3Value')} placeholder="5+" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 3 Label</label>
                <Input {...register('statsBar3Label')} placeholder="Years of Service" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 4 Value</label>
                <Input {...register('statsBar4Value')} placeholder="4.9 ★" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Stat 4 Label</label>
                <Input {...register('statsBar4Label')} placeholder="Rating" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              📣 Call to Action Section
              <span className="text-xs font-normal text-gray-400">(CTA banner section)</span>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">CTA Title</label>
                <Input {...register('ctaTitle')} placeholder="Ready to Go?" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">CTA Subtitle</label>
                <Input {...register('ctaSubtitle')} placeholder="Join thousands of satisfied passengers" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">CTA Button Text</label>
                <Input {...register('ctaButtonText')} placeholder="View Tariff Plans" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              👨‍👩‍👧‍👦 Family Business Section
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Section Title</label>
                <Input {...register('familyTitle')} placeholder="A Family Tradition of Excellence" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Section Text</label>
                <Textarea {...register('familyText')} placeholder="We are a family-owned business..." className="min-h-[100px]" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              ✨ Features Section
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Section Title</label>
                  <Input {...register('featuresTitle')} placeholder="Why Choose Us" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Section Subtitle</label>
                  <Input {...register('featuresSubtitle')} placeholder="Experience the difference with our premium service" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Feature 1</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('feature1Title')} placeholder="Professional Drivers" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('feature1Text')} placeholder="Our team consists of..." className="min-h-[80px]" />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Feature 2</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('feature2Title')} placeholder="Fixed Prices" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('feature2Text')} placeholder="Enjoy complete transparency..." className="min-h-[80px]" />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Feature 3</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('feature3Title')} placeholder="24/7 Availability" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('feature3Text')} placeholder="We are at your service..." className="min-h-[80px]" />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Feature 4</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('feature4Title')} placeholder="Luxury Vehicles" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('feature4Text')} placeholder="Travel in style and comfort..." className="min-h-[80px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🛠️ Services Section
            </h3>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Section Title</label>
                  <Input {...register('servicesTitle')} placeholder="Our Services" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Section Subtitle</label>
                  <Input {...register('servicesSubtitle')} placeholder="Professional transfers tailored to your needs" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Service 1</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('service1Title')} placeholder="Airport Transfers" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('service1Text')} placeholder="Seamless pickups and drop-offs..." className="min-h-[80px]" />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Service 2</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('service2Title')} placeholder="City Rides" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('service2Text')} placeholder="Comfortable travel within the city..." className="min-h-[80px]" />
                  </div>
                </div>

                <div className="space-y-4 p-4 bg-white/5 rounded-xl border border-white/5">
                  <h4 className="font-medium text-taxi-gold">Service 3</h4>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                    <Input {...register('service3Title')} placeholder="Hourly Service" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">Text</label>
                    <Textarea {...register('service3Text')} placeholder="Need a car for a few hours?..." className="min-h-[80px]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🦶 Footer
            </h3>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Copyright Text</label>
              <Input {...register('footerCopyright')}
                placeholder="© 2026 Taxi Service. All rights reserved." />
              <p className="text-xs text-gray-500 mt-2">
                Leave empty to use default: © {new Date().getFullYear()} {settings?.companyName || 'Taxi Service'}. All rights reserved.
              </p>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20 px-8 h-12 rounded-xl font-bold"
            >
              {isPending ? 'Saving...' : 'Save Branding'}
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'general' && (
        <form onSubmit={handleSubmit(onSettingsSubmit)} className="space-y-6 bg-white/5 p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Company Name</label>
              <Input {...register('companyName')} placeholder="City Taxi Co." />
              <p className="text-xs text-gray-500 mt-2">
                Displayed in emails and throughout the site
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Contact Email</label>
              <Input type="email" {...register('storeEmail')} placeholder="support@taxi-service.com" />
              <p className="text-xs text-gray-500 mt-2">
                Used in booking confirmation emails and customer support
              </p>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              🚖 Taxi Service Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Base City</label>
                <Input {...register('baseCity')} placeholder="London" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Taxi License Number</label>
                <Input {...register('taxiLicense')} placeholder="TX-12345" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Phone Number</label>
                <Input {...register('phoneNumber')} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">WhatsApp Number</label>
                <Input {...register('whatsappNumber')} placeholder="+1 (555) 000-0000" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Working Hours</label>
                <Input {...register('workingHours')} placeholder="24/7 or Mon-Fri 9:00-18:00" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Service Area</label>
                <Input {...register('serviceArea')} placeholder="City name or region" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Fleet Size</label>
                <Input type="number" {...register('fleetSize')} placeholder="10" />
              </div>
            </div>

            {/* Surcharges */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="text-md font-semibold text-white/80 mb-4 flex items-center gap-2">
                💰 Surcharges & Fees
                <span className="text-xs font-normal text-gray-400">(Added to trip price)</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Airport Surcharge (€)</label>
                  <Input type="number" step="0.5" min="0" {...register('airportSurcharge')} placeholder="5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Luggage Fee (€)</label>
                  <Input type="number" step="0.5" min="0" {...register('luggageFee')} placeholder="5" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Child Seat Fee (€)</label>
                  <Input type="number" step="0.5" min="0" {...register('childSeatFee')} placeholder="5" />
                </div>
              </div>
            </div>

            {/* Map Settings */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <h4 className="text-md font-semibold text-white/80 flex items-center gap-2">
                  🗺️ Map Settings
                </h4>
                <button
                  type="button"
                  onClick={() => setIsMapHelpModalOpen(true)}
                  className="text-gray-400 hover:text-taxi-gold transition-colors"
                  title="Map Settings Help"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Default Country</label>
                  <Select
                    value={watch('mapCountryCode') || ''}
                    onChange={(e) => setValue('mapCountryCode', e.target.value, { shouldDirty: true })}
                    options={COUNTRIES}
                    searchable={true}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Default Zoom</label>
                  <Select
                    value={String(watch('mapDefaultZoom') || '12')}
                    onChange={(e) => setValue('mapDefaultZoom', Number(e.target.value), { shouldDirty: true })}
                    options={[
                      { value: "10", label: "10 (City)" },
                      { value: "11", label: "11" },
                      { value: "12", label: "12 (Default)" },
                      { value: "13", label: "13" },
                      { value: "14", label: "14 (Street)" },
                      { value: "15", label: "15" },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Center Latitude</label>
                  <Input
                    type="number"
                    step="0.000001"
                    {...register('mapCenterLat')}
                    placeholder="51.5074"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-2">Center Longitude</label>
                  <Input
                    type="number"
                    step="0.000001"
                    {...register('mapCenterLng')}
                    placeholder="-0.1278"
                  />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-8 pt-8 border-t border-white/5">
              <h4 className="text-md font-semibold text-white/80 mb-4 flex items-center gap-2">
                💳 Payment Methods
              </h4>
              <div className="flex flex-wrap gap-8">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('enableCardPayment')}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50 focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                    Enable Card Payment
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    {...register('enableCashPayment')}
                    className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50 focus:ring-offset-0"
                  />
                  <span className="text-sm font-medium text-white/90 group-hover:text-white transition-colors">
                    Enable Cash Payment
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-white/10 pt-8">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Site Language (HTML lang)</label>
              <Select
                value={watch('siteLang') || 'en'}
                onChange={(e) => setValue('siteLang', e.target.value, { shouldDirty: true })}
                options={[
                  { value: "en", label: "English (en)" },
                  { value: "ru", label: "Russian (ru)" },
                  { value: "uk", label: "Ukrainian (uk)" },
                  { value: "de", label: "German (de)" },
                  { value: "fr", label: "French (fr)" },
                  { value: "es", label: "Spanish (es)" },
                ]}
              />
              <p className="text-xs text-gray-500 mt-2">
                Sets the lang attribute of the html tag
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Currency</label>
              <Select
                value={watch('currency') || 'EUR'}
                onChange={(e) => setValue('currency', e.target.value, { shouldDirty: true })}
                options={CURRENCIES.map(c => ({ value: c, label: c }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Tax Rate (%)</label>
              <Input
                type="number"
                step="0.01"
                min="0"
                {...register('taxRate', { min: 0 })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">TikTok URL</label>
              <Input {...register('tiktokUrl')} placeholder="https://tiktok.com/@yourtaxi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Facebook URL</label>
              <Input {...register('facebookUrl')} placeholder="https://facebook.com/yourtaxi" />
            </div>
            <div>
              <label className="block text-sm font-medium text-white/90 mb-2">Instagram URL</label>
              <Input {...register('instagramUrl')} placeholder="https://instagram.com/yourtaxi" />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button
              type="submit"
              disabled={isPending}
              className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20 px-8 h-12 rounded-xl font-bold"
            >
              {isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </form>
      )}

      {activeTab === 'cms' && (
        <div className="space-y-6 bg-white/5 p-8 rounded-3xl shadow-2xl border border-white/10 backdrop-blur-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-white">Pages</h2>
            <div className="flex space-x-2">
              <Button onClick={() => {
                startTransition(async () => {
                  const res = await seedCMSPages();
                  if (res.success) {
                    toast.success('Default pages seeded');
                    loadPages();
                  } else {
                    toast.error('Failed to seed pages');
                  }
                });
              }}
                variant="ghost"
                className="bg-white/10 border border-taxi-gold/30 text-taxi-gold hover:bg-white/20 hover:border-taxi-gold/50 transition-all"
                size="sm">
                Seed Default Pages
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2 mb-3 md:hidden select-none">
            ← Scroll left/right to see all →
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/5">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Slug
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {pages.map((page) => (
                  <tr key={page.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {page.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{page.slug}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditPage(page)}
                        className="text-taxi-gold hover:text-taxi-gold/80 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {pages.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">
                      No pages found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        title={editingPage?.slug === 'faq' ? "Manage FAQ Items" : "Edit Page"}
        size={editingPage?.slug === 'faq' ? "2xl" : "md"}
      >
        {editingPage?.slug === 'faq' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-medium">Question List</h3>
              <Button onClick={() => { resetFaqForm(); setIsFaqFormOpen(true); }} size="sm" className="bg-taxi-gold text-taxi-dark-navy">
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              <FaqTable
                items={faqItems}
                onEdit={handleEditFaq}
                onDelete={(id) => { setFaqToDeleteId(id); setIsFaqDeleteDialogOpen(true); }}
                onToggleVisibility={handleToggleFaqVisibility}
              />
            </div>
            <div className="flex justify-end pt-4 border-t border-white/10">
              <Button type="button" onClick={() => setIsModalOpen(false)} className="bg-white/10 text-white">
                Close
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={cmsForm.handleSubmit(onPageSubmit)} className="space-y-6">
            <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-6">
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Title</label>
                <Input {...cmsForm.register('title', { required: true })} placeholder="Page Title" />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Slug</label>
                <Input {...cmsForm.register('slug', { required: true })} placeholder="page-slug" disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/90 mb-2">Content</label>
                <Textarea
                  {...cmsForm.register('content', { required: true })}
                  placeholder="Page content"
                  className="min-h-[300px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} className="bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all">
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20 px-8 font-bold"
              >
                {isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* FAQ Item Form Dialog */}
      <Dialog
        open={isFaqFormOpen}
        onOpenChange={setIsFaqFormOpen}
        title={editingFaqId ? "Edit FAQ Item" : "Add FAQ Item"}
        onConfirm={onFaqSubmit}
        confirmText={editingFaqId ? "Update" : "Create"}
      >
        <div className="space-y-4 p-1">
          <Textarea
            label="Question*"
            placeholder="What is your question?"
            value={faqFormData.question}
            onChange={(e) => setFaqFormData({ ...faqFormData, question: e.target.value })}
            required
          />
          <Textarea
            label="Answer*"
            placeholder="Provide the answer here..."
            value={faqFormData.answer}
            onChange={(e) => setFaqFormData({ ...faqFormData, answer: e.target.value })}
            rows={5}
            required
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Category"
              placeholder="General"
              value={faqFormData.category}
              onChange={(e) => setFaqFormData({ ...faqFormData, category: e.target.value })}
            />
            <Input
              label="Sort Order"
              type="number"
              value={faqFormData.sortOrder}
              onChange={(e) => setFaqFormData({ ...faqFormData, sortOrder: parseInt(e.target.value) || 0 })}
            />
          </div>
          <div className="flex items-center gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <input
              type="checkbox"
              id="isVisibleFaq"
              checked={faqFormData.isVisible}
              onChange={(e) => setFaqFormData({ ...faqFormData, isVisible: e.target.checked })}
              className="w-5 h-5 rounded border-white/10 bg-white/5 text-taxi-gold focus:ring-taxi-gold/50"
            />
            <label htmlFor="isVisibleFaq" className="text-sm font-medium text-white/90 cursor-pointer">
              Visible on website
            </label>
          </div>
        </div>
      </Dialog>

      {/* FAQ Delete Confirm */}
      <Dialog
        open={isFaqDeleteDialogOpen}
        onOpenChange={setIsFaqDeleteDialogOpen}
        title="Delete FAQ Item"
        description="Are you sure you want to delete this question? This action cannot be undone."
        onConfirm={onFaqDelete}
        confirmText="Delete"
        isDangerous
      />

      <Modal open={isMapHelpModalOpen} onOpenChange={setIsMapHelpModalOpen} title="Map Settings Help">
        <div className="space-y-4 text-white/90">
          <p>
            These settings define the initial center point of the map on the booking page.
          </p>
          <p>
            You can find the latitude and longitude of your city by right-clicking on Google Maps. This ensures your customers immediately see the relevant area when they open the map.
          </p>
          <div className="flex justify-end pt-4 border-t border-white/10">
            <Button
              type="button"
              onClick={() => setIsMapHelpModalOpen(false)}
              className="bg-taxi-gold-gradient-left hover:opacity-90 text-taxi-dark-navy border-none shadow-lg shadow-taxi-gold/20 px-8 font-bold"
            >
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
