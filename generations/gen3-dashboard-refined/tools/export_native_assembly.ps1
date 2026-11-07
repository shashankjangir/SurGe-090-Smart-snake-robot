param([string]$Target, [string]$Source)
$ErrorActionPreference = 'Stop'
$dll = 'C:/Program Files/SOLIDWORKS Corp/SOLIDWORKS/api/redist/SolidWorks.Interop.sldworks.dll'
Add-Type -Path $dll
Add-Type -ReferencedAssemblies $dll -TypeDefinition @"
using System;
using SolidWorks.Interop.sldworks;
public class NativeAssemblyExport {
 public static void Run(string source, string target) {
  var sw = (ISldWorks)Activator.CreateInstance(Type.GetTypeFromProgID("SldWorks.Application.34"));
  bool owned = false;
  try {
   Console.WriteLine("Revision: " + sw.RevisionNumber());
   if(sw.GetDocumentCount()!=0) throw new Exception("Existing documents; refusing automation");
   owned = true;
   int err=0,warn=0;
   var doc=(IModelDoc2)sw.OpenDoc6(source,2,3,"",ref err,ref warn);
   Console.WriteLine("Open: " + err + ", " + warn);
   if(doc==null) throw new Exception("Open failed");
   doc.ClearSelection2(true);
   bool ok=doc.Extension.SaveAs(target,0,1,null,ref err,ref warn);
   Console.WriteLine("Export: " + ok + ", " + err + ", " + warn);
   if(!ok) throw new Exception("Export failed");
  } finally { if(owned) sw.ExitApp(); }
 }
}
"@
if(Get-Process SLDWORKS -ErrorAction SilentlyContinue) { throw 'Existing session' }
$root = Split-Path $PSScriptRoot -Parent
if (-not $Source) { $Source = Join-Path $root 'cad/3D_motion_parts/V2/assembly_neutral_2048_PROTOTYPE_fit_and_load_validation_required_v2.SLDASM' }
$src = [IO.Path]::GetFullPath($Source)
if (-not $Target) { $Target = Join-Path $root '../../.scratch/gen3-assembly-simulation/native_assembly.step' }
$Target = [IO.Path]::GetFullPath($Target)
if (Test-Path -LiteralPath $Target) { throw 'Export exists; select a new -Target path.' }
New-Item -ItemType Directory -Force (Split-Path $Target -Parent) | Out-Null
$before = (Get-FileHash -LiteralPath $src).Hash
try { [NativeAssemblyExport]::Run($src,$Target) }
finally {
 if ((Get-FileHash -LiteralPath $src).Hash -ne $before) { throw 'Native source changed unexpectedly.' }
}
