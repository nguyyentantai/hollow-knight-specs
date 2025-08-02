"use client";

import type React from "react";

import { Binary, Download, FileText, Save, Upload, Zap } from "lucide-react";
import { useCallback, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

type ParsedData = {
  geo: number;
  health: number;
  maxHealth: number;
  soul: number;
  maxSoul: number;
  dreamOrbs: number;
  permadeathMode: number;
  bossRushMode: number;
  completionPercentage: number;
};

const HollowKnightEditor = () => {
  const [file, setFile] = useState<File | null>(null);
  const [fileData, setFileData] = useState<ArrayBuffer | null>(null);
  const [hexData, setHexData] = useState<string>("");
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [modifiedData, setModifiedData] = useState<ParsedData | null>(null);
  const [error, setError] = useState<string>("");

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const uploadedFile = event.target.files?.[0];
      if (!uploadedFile) return;

      if (!uploadedFile.name.endsWith(".dat")) {
        setError("Please select a .dat file");
        return;
      }

      setFile(uploadedFile);
      setError("");

      const reader = new FileReader();
      reader.onload = (e) => {
        const buffer = e.target?.result as ArrayBuffer;
        setFileData(buffer);

        // Convert to hex string for display
        const uint8Array = new Uint8Array(buffer);
        const hexString = Array.from(uint8Array)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join(" ");
        setHexData(hexString);

        // Try to parse common Hollow Knight save data
        try {
          const parsed = parseHollowKnightData(uint8Array);
          setParsedData(parsed);
          setModifiedData({ ...parsed });
        } catch (err) {
          console.error("Failed to parse save data:", err);
        }
      };
      reader.readAsArrayBuffer(uploadedFile);
    },
    []
  );

  const parseHollowKnightData = (data: Uint8Array): ParsedData => {
    // This is a simplified parser - actual Hollow Knight save format is more complex
    // These offsets are approximate and may need adjustment based on save version
    const view = new DataView(data.buffer);

    try {
      return {
        geo: findIntValue(data, "geo") || 0,
        health: findIntValue(data, "health") || 5,
        maxHealth: findIntValue(data, "maxHealth") || 5,
        soul: findIntValue(data, "soul") || 33,
        maxSoul: findIntValue(data, "maxSoul") || 33,
        dreamOrbs: findIntValue(data, "dreamOrbs") || 0,
        permadeathMode: findIntValue(data, "permadeathMode") || 0,
        bossRushMode: findIntValue(data, "bossRushMode") || 0,
        completionPercentage: findFloatValue(data, "completionPercentage") || 0,
      };
    } catch (err) {
      throw new Error("Failed to parse save data");
    }
  };

  const findIntValue = (data: Uint8Array, key: string): number | null => {
    // Simple pattern matching for JSON-like structure in save file
    const text = new TextDecoder("utf-8", { fatal: false }).decode(data);
    const regex = new RegExp(`"${key}":(\\d+)`);
    const match = text.match(regex);
    return match ? Number.parseInt(match[1]) : null;
  };

  const findFloatValue = (data: Uint8Array, key: string): number | null => {
    const text = new TextDecoder("utf-8", { fatal: false }).decode(data);
    const regex = new RegExp(`"${key}":(\\d+\\.?\\d*)`);
    const match = text.match(regex);
    return match ? Number.parseFloat(match[1]) : null;
  };

  const handleDataChange = (field: keyof ParsedData, value: string) => {
    if (!modifiedData) return;

    const numValue =
      field === "completionPercentage"
        ? Number.parseFloat(value)
        : Number.parseInt(value);
    setModifiedData({
      ...modifiedData,
      [field]: isNaN(numValue) ? 0 : numValue,
    });
  };

  const applyModifications = () => {
    if (!fileData || !modifiedData) return;

    try {
      let modifiedText = new TextDecoder("utf-8", { fatal: false }).decode(
        fileData
      );

      // Replace values in the text representation
      Object.entries(modifiedData).forEach(([key, value]) => {
        const regex = new RegExp(`"${key}":(\\d+\\.?\\d*)`, "g");
        modifiedText = modifiedText.replace(regex, `"${key}":${value}`);
      });

      // Convert back to ArrayBuffer
      const encoder = new TextEncoder();
      const newData = encoder.encode(modifiedText);

      // Update hex display
      const hexString = Array.from(newData)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join(" ");
      setHexData(hexString);

      setFileData(newData.buffer);
      setError("");
    } catch (err) {
      setError("Failed to apply modifications");
    }
  };

  const downloadModifiedFile = () => {
    if (!fileData || !file) return;

    const blob = new Blob([fileData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = file.name.replace(".dat", "_modified.dat");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Hollow Knight Save Editor</h1>
        <p className="text-muted-foreground">
          Upload and modify your Hollow Knight save files (.dat). Always backup
          your original saves!
        </p>
      </div>

      {error && (
        <Alert className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Save File
          </CardTitle>
          <CardDescription>
            Select your Hollow Knight save file (usually located in
            %USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight\)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input
              type="file"
              accept=".dat"
              onChange={handleFileUpload}
              className="flex-1"
            />
            {file && (
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                <span className="text-sm text-muted-foreground">
                  {file.name}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {fileData && (
        <Tabs defaultValue="editor" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="editor">Save Editor</TabsTrigger>
            <TabsTrigger value="hex">Hex View</TabsTrigger>
            <TabsTrigger value="tools">Quick Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="editor" className="space-y-6">
            {parsedData && modifiedData && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Game Data Editor
                  </CardTitle>
                  <CardDescription>
                    Modify your save game values. Click &apos;Apply
                    Changes&apos; to update the file.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="geo">Geo (Currency)</Label>
                      <Input
                        id="geo"
                        type="number"
                        value={modifiedData.geo}
                        onChange={(e) =>
                          handleDataChange("geo", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="health">Current Health</Label>
                      <Input
                        id="health"
                        type="number"
                        min="1"
                        max="9"
                        value={modifiedData.health}
                        onChange={(e) =>
                          handleDataChange("health", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxHealth">Max Health</Label>
                      <Input
                        id="maxHealth"
                        type="number"
                        min="1"
                        max="9"
                        value={modifiedData.maxHealth}
                        onChange={(e) =>
                          handleDataChange("maxHealth", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="soul">Current Soul</Label>
                      <Input
                        id="soul"
                        type="number"
                        min="0"
                        max="198"
                        value={modifiedData.soul}
                        onChange={(e) =>
                          handleDataChange("soul", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="maxSoul">Max Soul</Label>
                      <Input
                        id="maxSoul"
                        type="number"
                        min="33"
                        max="198"
                        value={modifiedData.maxSoul}
                        onChange={(e) =>
                          handleDataChange("maxSoul", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="dreamOrbs">Dream Orbs</Label>
                      <Input
                        id="dreamOrbs"
                        type="number"
                        min="0"
                        value={modifiedData.dreamOrbs}
                        onChange={(e) =>
                          handleDataChange("dreamOrbs", e.target.value)
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="completionPercentage">Completion %</Label>
                      <Input
                        id="completionPercentage"
                        type="number"
                        min="0"
                        max="112"
                        step="0.1"
                        value={modifiedData.completionPercentage}
                        onChange={(e) =>
                          handleDataChange(
                            "completionPercentage",
                            e.target.value
                          )
                        }
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-4">
                    <Button
                      onClick={applyModifications}
                      className="flex items-center gap-2"
                    >
                      <Save className="h-4 w-4" />
                      Apply Changes
                    </Button>
                    <Button
                      onClick={downloadModifiedFile}
                      variant="outline"
                      className="flex items-center gap-2 bg-transparent"
                    >
                      <Download className="h-4 w-4" />
                      Download Modified File
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="hex" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Binary className="h-5 w-5" />
                  Hex Editor
                </CardTitle>
                <CardDescription>
                  Raw hex view of your save file. Advanced users can edit
                  directly.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={hexData}
                  onChange={(e) => setHexData(e.target.value)}
                  className="font-mono text-xs h-96"
                  placeholder="Hex data will appear here..."
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Modifications</CardTitle>
                  <CardDescription>
                    Common save file modifications
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() =>
                      modifiedData &&
                      setModifiedData({ ...modifiedData, geo: 999999 })
                    }
                    variant="outline"
                    className="w-full justify-start"
                  >
                    Max Geo (999,999)
                  </Button>
                  <Button
                    onClick={() =>
                      modifiedData &&
                      setModifiedData({
                        ...modifiedData,
                        health: 9,
                        maxHealth: 9,
                      })
                    }
                    variant="outline"
                    className="w-full justify-start"
                  >
                    Max Health (9 masks)
                  </Button>
                  <Button
                    onClick={() =>
                      modifiedData &&
                      setModifiedData({
                        ...modifiedData,
                        soul: 198,
                        maxSoul: 198,
                      })
                    }
                    variant="outline"
                    className="w-full justify-start"
                  >
                    Max Soul (198)
                  </Button>
                  <Button
                    onClick={() =>
                      modifiedData &&
                      setModifiedData({ ...modifiedData, dreamOrbs: 2400 })
                    }
                    variant="outline"
                    className="w-full justify-start"
                  >
                    Max Dream Orbs (2400)
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Safety Tips</CardTitle>
                  <CardDescription>Important information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                    <p className="font-medium text-yellow-800 dark:text-yellow-200">
                      ⚠️ Always backup your saves!
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-300">
                      Copy your original .dat files before modifying.
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      💡 Save Location
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                      %USERPROFILE%\AppData\LocalLow\Team Cherry\Hollow Knight\
                    </p>
                  </div>
                  <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      ✅ Compatibility
                    </p>
                    <p className="text-green-700 dark:text-green-300">
                      Works with most Hollow Knight save versions.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default HollowKnightEditor;
