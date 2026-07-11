import React from "react";
import {
  Box,
  Divider,
  List,
  ListItemButton,
  ListItemText,
  Typography,
  useTheme,
} from "@mui/material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const navItems = [
  { label: "Overview", icon: DashboardOutlinedIcon },
  { label: "Reports", icon: InsightsOutlinedIcon },
  { label: "Clients", icon: GroupsOutlinedIcon },
  { label: "Settings", icon: SettingsOutlinedIcon },
];

const Sidebar = ({ isSidebarOpen }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        width: isSidebarOpen ? 250 : 0,
        minWidth: isSidebarOpen ? 250 : 0,
        transition: "all 0.25s ease",
        overflow: "hidden",
        borderRight: isSidebarOpen
          ? `1px solid ${theme.palette.primary.light}`
          : "none",
        backgroundColor: theme.palette.background.alt,
      }}
    >
      <Box p={2.5}>
        <Typography variant="h5" fontWeight={700} mb={0.5}>
          Finsight
        </Typography>
        <Typography color={theme.palette.grey[300]}>
          Navigation preview
        </Typography>
      </Box>
      <Divider />
      <List sx={{ px: 1.5, py: 1 }}>
        {navItems.map(({ label, icon: Icon }) => (
          <ListItemButton
            key={label}
            sx={{
              borderRadius: "0.9rem",
              mb: 0.75,
              py: 1.25,
            }}
          >
            <Icon
              sx={{
                mr: 1.5,
                color: theme.palette.secondary.main,
              }}
            />
            <ListItemText
              primary={label}
              primaryTypographyProps={{
                fontWeight: 600,
              }}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
};

export default Sidebar;
