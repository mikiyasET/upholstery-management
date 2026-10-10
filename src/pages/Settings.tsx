import { useState, useMemo } from "react";
import {
  Box,
  Button,
  Group,
  Title,
  Text,
  Badge,
  Tabs,
  TextInput,
  SimpleGrid,
  ActionIcon,
  Modal,
  Tooltip,
  Paper,
  Grid,
  ThemeIcon,
  Stack,
  Divider,
  Switch,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";
import {
  RiBuildingLine,
  RiLayoutMasonryLine,
  RiBillLine,
  RiFilePaper2Line,
  RiShieldKeyholeLine,
  RiBarcodeBoxLine,
  RiSearchLine,
  RiCloseLine,
  RiEyeLine,
  RiFileCopyLine,
  RiCheckDoubleLine,
  RiSaveLine,
  RiPrinterLine,
  RiCarLine,
  RiStore2Line,
  RiPhoneLine,
  RiMapPinLine,
  RiMailLine,
  RiAwardLine,
} from "react-icons/ri";
import { PageHeader } from "../components/common/PageHeader";
import dayjs from "dayjs";

type TemplateCategory = "ALL" | "INVOICES" | "RECEIPTS" | "CHECKLISTS" | "GATEPASS";

interface DocumentTemplateItem {
  id: string;
  name: string;
  category: TemplateCategory;
  type: string;
  description: string;
  pageSize: "A4" | "80mm";
  isDefault: boolean;
  updatedAt: string;
  sampleHtml: string;
}

const INITIAL_TEMPLATES: DocumentTemplateItem[] = [
  {
    id: "tpl-1",
    name: "A4 Work Order Commercial Invoice",
    category: "INVOICES",
    type: "WORK_ORDER_INVOICE",
    description: "Official branded full-page A4 invoice with customer details, vehicle license plate, line items, and VAT summary.",
    pageSize: "A4",
    isDefault: true,
    updatedAt: "2026-04-10",
    sampleHtml: `
      <div style="font-family: sans-serif; padding: 24px; color: #111;">
        <div style="display:flex; justify-content:space-between; border-bottom: 2px solid #F59E0B; padding-bottom: 12px; margin-bottom: 16px;">
          <div>
            <h2 style="margin:0; font-size: 20px; font-weight:800; color:#111;">YONATAN CAR DECORATION & UPHOLSTERY</h2>
            <p style="margin:2px 0; font-size:12px; color:#666;">Addis Ababa, Ethiopia • Tel: +251 911 234 567</p>
          </div>
          <div style="text-align:right;">
            <span style="background:#FEF3C7; color:#92400E; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:bold;">WORK ORDER INVOICE</span>
            <div style="font-family:monospace; font-size:16px; font-weight:bold; margin-top:4px;">#WO-2026-0042</div>
          </div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:20px; font-size:12px; background:#f9fafb; padding:12px; border-radius:6px;">
          <div>
            <strong>CUSTOMER:</strong> Abebe Kebede<br/>
            <strong>PHONE:</strong> +251 912 345 678
          </div>
          <div>
            <strong>VEHICLE:</strong> Toyota Land Cruiser V8<br/>
            <strong>PLATE:</strong> 3 - A 12345 AA
          </div>
        </div>
        <table style="width:100%; border-collapse:collapse; font-size:12px; margin-bottom:20px;">
          <thead>
            <tr style="background:#F3F4F6; text-align:left;">
              <th style="padding:8px; border-bottom:1px solid #ddd;">Description</th>
              <th style="padding:8px; border-bottom:1px solid #ddd; text-align:center;">Qty</th>
              <th style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">Unit Price</th>
              <th style="padding:8px; border-bottom:1px solid #ddd; text-align:right;">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #eee;">Full Leather Seat Upholstery (Premium Italian Napa)</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">1</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">45,000.00 ETB</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">45,000.00 ETB</td>
            </tr>
            <tr>
              <td style="padding:8px; border-bottom:1px solid #eee;">Custom Steering Wheel Stitching</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:center;">1</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">3,500.00 ETB</td>
              <td style="padding:8px; border-bottom:1px solid #eee; text-align:right;">3,500.00 ETB</td>
            </tr>
          </tbody>
        </table>
        <div style="display:flex; justify-content:flex-end; font-size:13px;">
          <div style="width:220px; line-height:1.6;">
            <div style="display:flex; justify-content:space-between;"><span>Subtotal:</span><span>48,500.00 ETB</span></div>
            <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:15px; color:#D97706; border-top:1px solid #ddd; padding-top:4px; margin-top:4px;">
              <span>Total Due:</span><span>48,500.00 ETB</span>
            </div>
          </div>
        </div>
      </div>
    `,
  },
  {
    id: "tpl-2",
    name: "80mm POS Thermal Cash Receipt",
    category: "RECEIPTS",
    type: "DIRECT_SALE_RECEIPT",
    description: "Compact 80mm thermal roll receipt optimized for over-the-counter POS direct retail accessories.",
    pageSize: "80mm",
    isDefault: true,
    updatedAt: "2026-04-09",
    sampleHtml: `
      <div style="font-family: monospace; width: 280px; margin: auto; padding: 12px; font-size: 11px; text-align: center; color: #111;">
        <h3 style="margin:0; font-size:14px; font-weight:900;">YONATAN CAR DECOR</h3>
        <p style="margin:2px 0; font-size:10px;">Direct Sales Counter Receipt</p>
        <p style="margin:2px 0; font-size:9px;">Addis Ababa, Ethiopia</p>
        <div style="border-top:1px dashed #666; margin:8px 0;"></div>
        <div style="text-align:left; font-size:10px;">
          <div>Receipt #: DS-2026-0189</div>
          <div>Date: 10/04/2026 15:42</div>
          <div>Client: Walk-in Retail Customer</div>
        </div>
        <div style="border-top:1px dashed #666; margin:8px 0;"></div>
        <div style="display:flex; justify-content:space-between; text-align:left; font-weight:bold; font-size:10px;">
          <span>Item</span><span>Qty</span><span>Amt</span>
        </div>
        <div style="display:flex; justify-content:space-between; text-align:left; font-size:10px; margin-top:4px;">
          <span>Carbon Fiber Keychain</span><span>2</span><span>600.00</span>
        </div>
        <div style="display:flex; justify-content:space-between; text-align:left; font-size:10px; margin-top:2px;">
          <span>Car Perfume Clip</span><span>1</span><span>450.00</span>
        </div>
        <div style="border-top:1px dashed #666; margin:8px 0;"></div>
        <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:12px;">
          <span>TOTAL:</span><span>1,050.00 ETB</span>
        </div>
        <div style="display:flex; justify-content:space-between; font-size:10px; margin-top:2px;">
          <span>Paid via:</span><span>Telebirr</span>
        </div>
        <div style="border-top:1px dashed #666; margin:8px 0;"></div>
        <p style="font-size:9px; margin:0;">Thank you for your business!</p>
      </div>
    `,
  },
  {
    id: "tpl-3",
    name: "Vehicle Intake & Condition Checklist",
    category: "CHECKLISTS",
    type: "VEHICLE_CHECKLIST",
    description: "Inspection sheet with 360-degree vehicle condition notes, fuel level, existing scratches, and customer sign-off.",
    pageSize: "A4",
    isDefault: false,
    updatedAt: "2026-04-05",
    sampleHtml: `
      <div style="font-family: sans-serif; padding: 24px; color: #111;">
        <h2 style="margin:0 0 8px; font-size: 18px; font-weight:800; border-bottom:2px solid #333; padding-bottom:8px;">
          VEHICLE INTAKE & CONDITION INSPECTION
        </h2>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; font-size:12px; margin-bottom:16px;">
          <div><strong>Order #:</strong> WO-2026-0042</div>
          <div><strong>Plate:</strong> 3 - A 12345 AA</div>
          <div><strong>Mileage In:</strong> 42,150 km</div>
          <div><strong>Fuel Level:</strong> 3/4 Tank</div>
        </div>
        <div style="border:1px solid #ccc; padding:12px; border-radius:6px; font-size:12px; margin-bottom:16px;">
          <h4 style="margin:0 0 6px;">Pre-Existing Exterior/Interior Conditions:</h4>
          <p style="margin:0; color:#555;">[✓] Front Bumper Minor Stone Chips &nbsp;&nbsp; [✓] Dashboard Sun Glare Normal &nbsp;&nbsp; [✓] Spare Tire Present</p>
        </div>
        <div style="display:flex; justify-content:space-between; margin-top:40px; font-size:11px;">
          <div style="border-top:1px solid #666; width:180px; text-align:center; padding-top:4px;">Customer Signature</div>
          <div style="border-top:1px solid #666; width:180px; text-align:center; padding-top:4px;">Workshop Inspector</div>
        </div>
      </div>
    `,
  },
  {
    id: "tpl-4",
    name: "Gate Pass & Delivery Slip",
    category: "GATEPASS",
    type: "DELIVERY_NOTE",
    description: "Security release authorization confirming customer full settlement and vehicle handoff clearance.",
    pageSize: "A4",
    isDefault: false,
    updatedAt: "2026-04-01",
    sampleHtml: `
      <div style="font-family: sans-serif; padding: 24px; color: #111;">
        <div style="border: 2px dashed #10B981; padding: 20px; border-radius: 8px;">
          <h2 style="margin:0; color:#065F46; font-size: 18px;">OFFICIAL GATE PASS & CLEARANCE SLIP</h2>
          <p style="margin:4px 0 16px; font-size:12px; color:#555;">Authorized to exit workshop premises</p>
          <div style="font-size:12px; line-height:1.6;">
            <div><strong>Vehicle Plate:</strong> 3 - A 12345 AA</div>
            <div><strong>Customer Name:</strong> Abebe Kebede</div>
            <div><strong>Payment Status:</strong> FULLY SETTLED (100%)</div>
            <div><strong>Released By:</strong> Workshop Manager</div>
          </div>
        </div>
      </div>
    `,
  },
];

const TEMPLATE_CATEGORIES = [
  { key: "ALL", label: "All Layouts", icon: RiLayoutMasonryLine, color: "amber" },
  { key: "INVOICES", label: "Work Order Invoices", icon: RiBillLine, color: "amber" },
  { key: "RECEIPTS", label: "POS Thermal Receipts", icon: RiFilePaper2Line, color: "blue" },
  { key: "CHECKLISTS", label: "Inspection Checklists", icon: RiCarLine, color: "teal" },
  { key: "GATEPASS", label: "Gate Passes & Slips", icon: RiAwardLine, color: "green" },
];

export default function Settings() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<string | null>("studio");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategory>("ALL");

  // Template Studio State
  const [templates, setTemplates] = useState<DocumentTemplateItem[]>(INITIAL_TEMPLATES);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<DocumentTemplateItem | null>(null);

  // Workshop Profile State
  const [profile, setProfile] = useState({
    workshopName: "Yonatan Car Decoration & Upholstery",
    nameAmharic: "ዮናታን የመኪና ዲኮር እና የኮርቻ ስራ",
    phone: "+251 911 234 567",
    email: "info@yonatanupholstery.com",
    address: "Bole Sub-City, Next to Edna Mall",
    city: "Addis Ababa, Ethiopia",
    tinNumber: "0012345678",
    tradeLicense: "TR-AA-2024-8891",
    telebirrAccount: "0911234567",
    cbeAccount: "1000123456789",
  });

  // Number Sequences State
  const [sequences, setSequences] = useState({
    orderPrefix: "WO-",
    orderNextNumber: "0043",
    posPrefix: "DS-",
    posNextNumber: "0190",
    receiptPrefix: "REC-",
    receiptNextNumber: "0312",
  });

  // Filter templates
  const filteredTemplates = useMemo(() => {
    return templates.filter((tpl) => {
      const matchesCategory = selectedCategory === "ALL" || tpl.category === selectedCategory;
      const matchesSearch =
        searchQuery === "" ||
        tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [templates, selectedCategory, searchQuery]);

  const handleSaveProfile = () => {
    notifications.show({
      title: "Settings Saved",
      message: "Workshop identity and profile settings have been successfully updated.",
      color: "green",
    });
  };

  const handleDuplicateTemplate = (tpl: DocumentTemplateItem) => {
    const copy: DocumentTemplateItem = {
      ...tpl,
      id: `tpl-${Date.now()}`,
      name: `${tpl.name} (Copy)`,
      isDefault: false,
      updatedAt: dayjs().format("YYYY-MM-DD"),
    };
    setTemplates((prev) => [copy, ...prev]);
    notifications.show({
      title: "Template Duplicated",
      message: `Created duplicate layout "${copy.name}".`,
      color: "amber",
    });
  };

  const handleSetDefault = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isDefault: true } : { ...t, isDefault: false }))
    );
    notifications.show({
      title: "Default Template Updated",
      message: "Selected layout is now set as standard output for this category.",
      color: "green",
    });
  };

  return (
    <Box pb="xl" className="animate-in fade-in duration-300">
      {/* 1. Executive Standard PageHeader */}
      <PageHeader
        title={t("settings.title", "Settings & Template Studio")}
        subtitle={t(
          "settings.subtitle",
          "Manage workshop identity, Handlebars print layouts in Template Studio, number sequences, and security controls."
        )}
        onRefresh={() => {
          notifications.show({
            title: "Settings Refreshed",
            message: "System preferences reloaded to current state.",
            color: "amber",
          });
        }}
        refreshTooltip="Refresh settings"
        action={
          <Button
            variant="gradient"
            gradient={{ from: "#F59E0B", to: "#D97706", deg: 135 }}
            radius="md"
            leftSection={<RiSaveLine size={18} />}
            onClick={handleSaveProfile}
            style={{
              boxShadow: "0 4px 14px rgba(245, 158, 11, 0.25)",
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
              letterSpacing: "-0.01em",
              height: 36,
            }}
          >
            {t("common.saveChanges", "Save Changes")}
          </Button>
        }
      />

      {/* 2. Top Metric KPI Summary Cards */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md" mb="xl">
        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box style={{ flex: 1, minWidth: 0 }}>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }} truncate>
                Workshop Entity
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4} truncate>
                {profile.workshopName}
              </Text>
              <Text size="xs" c="dimmed" mt={4} truncate>
                TIN: {profile.tinNumber}
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: "rgba(245, 158, 11, 0.12)",
                color: "var(--primary-accent)",
              }}
            >
              <RiBuildingLine size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                Template Studio
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                {templates.length} Print Layouts
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                A4 & Thermal Receipts
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
              }}
            >
              <RiLayoutMasonryLine size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                Dual Storage Stores
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                2 Active Hubs
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Mini Floor + Main Warehouse
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
              }}
            >
              <RiStore2Line size={20} />
            </Box>
          </Group>
        </Box>

        <Box className="premium-card" p="md">
          <Group justify="space-between" align="flex-start">
            <Box>
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: "0.05em" }}>
                Access Policy
              </Text>
              <Text fw={700} size="1.25rem" lh={1.2} mt={4}>
                Role-Based RBAC
              </Text>
              <Text size="xs" c="dimmed" mt={4}>
                Admin, Cashier, Technician
              </Text>
            </Box>
            <Box
              className="stat-icon-wrapper"
              style={{
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
              }}
            >
              <RiShieldKeyholeLine size={20} />
            </Box>
          </Group>
        </Box>
      </SimpleGrid>

      {/* 3. Main Settings Tabs Hub */}
      <Tabs value={activeTab} onChange={setActiveTab} variant="pills" radius="md">
        <Tabs.List mb="lg" style={{ gap: 8, flexWrap: "wrap" }}>
          <Tabs.Tab value="studio" leftSection={<RiLayoutMasonryLine size={16} />}>
            Template Studio
          </Tabs.Tab>
          <Tabs.Tab value="profile" leftSection={<RiBuildingLine size={16} />}>
            Workshop Identity
          </Tabs.Tab>
          <Tabs.Tab value="sequences" leftSection={<RiBarcodeBoxLine size={16} />}>
            Number Sequences
          </Tabs.Tab>
          <Tabs.Tab value="security" leftSection={<RiShieldKeyholeLine size={16} />}>
            Security & Passwords
          </Tabs.Tab>
        </Tabs.List>

        {/* TAB 1: TEMPLATE STUDIO */}
        <Tabs.Panel value="studio">
          {/* Category Filter Pills & Search Bar */}
          <Box className="premium-card" p="md" mb="lg">
            <Group justify="space-between" align="center" wrap="wrap" gap="md">
              {/* Live Search Input */}
              <TextInput
                placeholder="Search templates by title, format, or keyword..."
                leftSection={<RiSearchLine size={16} />}
                rightSection={
                  searchQuery ? (
                    <ActionIcon size="sm" variant="subtle" color="gray" onClick={() => setSearchQuery("")}>
                      <RiCloseLine size={14} />
                    </ActionIcon>
                  ) : null
                }
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                style={{ flex: 1, minWidth: 260 }}
              />

              {/* Category Pills */}
              <Group gap="xs" wrap="wrap">
                {TEMPLATE_CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.key;
                  const count =
                    cat.key === "ALL"
                      ? templates.length
                      : templates.filter((t) => t.category === cat.key).length;

                  return (
                    <Button
                      key={cat.key}
                      size="xs"
                      variant={isSelected ? "filled" : "light"}
                      color="amber"
                      leftSection={<cat.icon size={14} />}
                      onClick={() => setSelectedCategory(cat.key as TemplateCategory)}
                      radius="md"
                    >
                      {cat.label} ({count})
                    </Button>
                  );
                })}
              </Group>
            </Group>
          </Box>

          {/* Grid of Templates */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 2 }} spacing="lg">
            {filteredTemplates.map((template) => (
              <Box key={template.id} className="premium-card" p="lg" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                <Box>
                  <Group justify="space-between" align="flex-start" mb="xs">
                    <Group gap="xs">
                      <ThemeIcon size={36} radius="md" color="amber" variant="light">
                        {template.pageSize === "A4" ? <RiBillLine size={20} /> : <RiPrinterLine size={20} />}
                      </ThemeIcon>
                      <Box>
                        <Text fw={700} size="md" style={{ letterSpacing: "-0.01em" }}>
                          {template.name}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {template.pageSize} Paper • {template.type}
                        </Text>
                      </Box>
                    </Group>

                    {template.isDefault && (
                      <Badge color="green" variant="light" size="sm">
                        Default
                      </Badge>
                    )}
                  </Group>

                  <Text size="sm" c="dimmed" mt="xs" mb="md" style={{ lineHeight: 1.5 }}>
                    {template.description}
                  </Text>
                </Box>

                <Box pt="sm" style={{ borderTop: "1px solid var(--surface-border)" }}>
                  <Group justify="space-between" align="center">
                    <Text size="xs" c="dimmed">
                      Updated {dayjs(template.updatedAt).format("MMM D, YYYY")}
                    </Text>

                    <Group gap="xs">
                      <Button
                        size="xs"
                        variant="light"
                        color="amber"
                        leftSection={<RiEyeLine size={14} />}
                        onClick={() => {
                          setPreviewData(template);
                          setPreviewModalOpen(true);
                        }}
                      >
                        Live Preview
                      </Button>

                      <Tooltip label="Duplicate Template" withArrow>
                        <ActionIcon
                          variant="subtle"
                          color="gray"
                          size="md"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <RiFileCopyLine size={16} />
                        </ActionIcon>
                      </Tooltip>

                      {!template.isDefault && (
                        <Tooltip label="Set as Default" withArrow>
                          <ActionIcon
                            variant="subtle"
                            color="green"
                            size="md"
                            onClick={() => handleSetDefault(template.id)}
                          >
                            <RiCheckDoubleLine size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
                    </Group>
                  </Group>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        </Tabs.Panel>

        {/* TAB 2: WORKSHOP PROFILE */}
        <Tabs.Panel value="profile">
          <Box className="premium-card" p="xl">
            <Title order={3} size="h4" mb="xs">
              Commercial & Workshop Entity Details
            </Title>
            <Text size="sm" c="dimmed" mb="lg">
              These details are automatically printed on Work Order invoices, proforma estimates, and receipts.
            </Text>

            <Grid gap="md">
              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Workshop Trading Name (English)"
                  value={profile.workshopName}
                  onChange={(e) => setProfile({ ...profile, workshopName: e.target.value })}
                  leftSection={<RiBuildingLine size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="የድርጅቱ ስም (Amharic)"
                  value={profile.nameAmharic}
                  onChange={(e) => setProfile({ ...profile, nameAmharic: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Official Telephone Number"
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  leftSection={<RiPhoneLine size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Business Email Address"
                  value={profile.email}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  leftSection={<RiMailLine size={16} />}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Tax Identification Number (TIN)"
                  value={profile.tinNumber}
                  onChange={(e) => setProfile({ ...profile, tinNumber: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Trade License Number"
                  value={profile.tradeLicense}
                  onChange={(e) => setProfile({ ...profile, tradeLicense: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Telebirr Merchant / Phone Number"
                  value={profile.telebirrAccount}
                  onChange={(e) => setProfile({ ...profile, telebirrAccount: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 6 }}>
                <TextInput
                  label="Commercial Bank of Ethiopia (CBE) Account"
                  value={profile.cbeAccount}
                  onChange={(e) => setProfile({ ...profile, cbeAccount: e.target.value })}
                />
              </Grid.Col>

              <Grid.Col span={{ base: 12 }}>
                <TextInput
                  label="Physical Location & Workshop Address"
                  value={profile.address}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  leftSection={<RiMapPinLine size={16} />}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<RiSaveLine size={16} />}
                onClick={handleSaveProfile}
              >
                Save Workshop Profile
              </Button>
            </Group>
          </Box>
        </Tabs.Panel>

        {/* TAB 3: NUMBER SEQUENCES */}
        <Tabs.Panel value="sequences">
          <Box className="premium-card" p="xl">
            <Title order={3} size="h4" mb="xs">
              Automated Number Sequences
            </Title>
            <Text size="sm" c="dimmed" mb="lg">
              Configure serial numbering format and auto-increment codes for invoices, work orders, and direct sales.
            </Text>

            <Grid gap="lg">
              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" radius="md" withBorder>
                  <Text fw={700} size="sm" mb={4}>
                    Work Orders
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Format: Prefix + Year + Serial (e.g. WO-2026-0043)
                  </Text>
                  <TextInput
                    label="Prefix"
                    value={sequences.orderPrefix}
                    onChange={(e) => setSequences({ ...sequences, orderPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label="Next Number"
                    value={sequences.orderNextNumber}
                    onChange={(e) => setSequences({ ...sequences, orderNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" radius="md" withBorder>
                  <Text fw={700} size="sm" mb={4}>
                    Direct Sales POS
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Format: Prefix + Serial (e.g. DS-0190)
                  </Text>
                  <TextInput
                    label="Prefix"
                    value={sequences.posPrefix}
                    onChange={(e) => setSequences({ ...sequences, posPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label="Next Number"
                    value={sequences.posNextNumber}
                    onChange={(e) => setSequences({ ...sequences, posNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>

              <Grid.Col span={{ base: 12, md: 4 }}>
                <Paper p="md" radius="md" withBorder>
                  <Text fw={700} size="sm" mb={4}>
                    Cash Receipts
                  </Text>
                  <Text size="xs" c="dimmed" mb="md">
                    Format: Prefix + Serial (e.g. REC-0312)
                  </Text>
                  <TextInput
                    label="Prefix"
                    value={sequences.receiptPrefix}
                    onChange={(e) => setSequences({ ...sequences, receiptPrefix: e.target.value })}
                    mb="xs"
                  />
                  <TextInput
                    label="Next Number"
                    value={sequences.receiptNextNumber}
                    onChange={(e) => setSequences({ ...sequences, receiptNextNumber: e.target.value })}
                  />
                </Paper>
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" mt="xl">
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<RiSaveLine size={16} />}
                onClick={() => {
                  notifications.show({
                    title: "Sequences Saved",
                    message: "Number sequence counters updated successfully.",
                    color: "green",
                  });
                }}
              >
                Update Sequences
              </Button>
            </Group>
          </Box>
        </Tabs.Panel>

        {/* TAB 4: SECURITY & PASSWORDS */}
        <Tabs.Panel value="security">
          <Box className="premium-card" p="xl" style={{ maxWidth: 650 }}>
            <Title order={3} size="h4" mb="xs">
              Account Security & Password
            </Title>
            <Text size="sm" c="dimmed" mb="lg">
              Update your account credentials and manage session preferences.
            </Text>

            <Stack gap="md">
              <TextInput label="Current Password" type="password" placeholder="••••••••" />
              <TextInput label="New Password" type="password" placeholder="••••••••" />
              <TextInput label="Confirm New Password" type="password" placeholder="••••••••" />

              <Divider my="sm" />

              <Group justify="space-between" align="center">
                <Box>
                  <Text fw={600} size="sm">
                    Two-Factor Authentication
                  </Text>
                  <Text size="xs" c="dimmed">
                    Require SMS or authenticator app verification on login
                  </Text>
                </Box>
                <Switch color="amber" defaultChecked={false} />
              </Group>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="gradient"
                  gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                  onClick={() => {
                    notifications.show({
                      title: "Security Settings Updated",
                      message: "Password and security settings verified.",
                      color: "green",
                    });
                  }}
                >
                  Save Security Changes
                </Button>
              </Group>
            </Stack>
          </Box>
        </Tabs.Panel>
      </Tabs>

      {/* Live Preview Modal */}
      <Modal
        opened={previewModalOpen}
        onClose={() => setPreviewModalOpen(false)}
        title={
          <Group gap="xs">
            <RiPrinterLine size={20} color="var(--primary-accent)" />
            <Text fw={700}>{previewData?.name || "Template Preview"}</Text>
            <Badge size="xs" color="amber">
              {previewData?.pageSize}
            </Badge>
          </Group>
        }
        size="lg"
        radius="lg"
      >
        {previewData && (
          <Box>
            <Paper
              p="md"
              radius="md"
              withBorder
              style={{
                backgroundColor: "#ffffff",
                color: "#111111",
                minHeight: 400,
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.05)",
                overflowX: "auto",
              }}
            >
              <div dangerouslySetInnerHTML={{ __html: previewData.sampleHtml }} />
            </Paper>

            <Group justify="flex-end" mt="md">
              <Button variant="default" onClick={() => setPreviewModalOpen(false)}>
                Close Preview
              </Button>
              <Button
                variant="gradient"
                gradient={{ from: "amber.6", to: "amber.7", deg: 135 }}
                leftSection={<RiPrinterLine size={16} />}
                onClick={() => {
                  window.print();
                }}
              >
                Test Print Sample
              </Button>
            </Group>
          </Box>
        )}
      </Modal>
    </Box>
  );
}
