import React, { useState } from "react";
import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import { useSelector } from "react-redux";
import Navbar from "components/Navbar";
import Sidebar from "components/Sidebar";


const Layout = () => {
  const user = useSelector((state) => state.global.user);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  return (
    <Box width="100%" minHeight="100%" bgcolor="background.default">
      <Navbar
        user={user}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />
      <Box display="flex" minHeight="calc(100vh - 64px)">
        <Sidebar isSidebarOpen={isSidebarOpen} />
        <Box flexGrow={1} overflow="auto">
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default Layout;
